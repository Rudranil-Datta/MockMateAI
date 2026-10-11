import { AppError } from "../utils/AppError.js";
import { performance } from "node:perf_hooks";
import {
  validateAdaptiveQuestionInput,
  validateAdaptiveQuestionOutput,
  validateEvaluationInput,
  validateEvaluationOutput,
  validateV2EvaluationInput,
  validateV2EvaluationOutput,
  validateJobTargetAnalysisInput,
  validateJobTargetAnalysisOutput,
  validateProjectExtractionInput,
  validateProjectExtractionOutput,
  validateQuestionInput,
  validateQuestionOutput,
} from "../validators/aiSchemas.js";
import {
  createGeminiProvider,
  geminiStructuredProfile,
} from "./geminiProvider.js";
import { createMockAiProvider } from "./mockAiProvider.js";

const defaultQuestionCacheTtlMs = 60_000;
const maxErrorChainDepth = 4;
const minimumRetryBudgetMs = 3_000;
const minimumRetryDelayMs = 500;
const retryDelayRangeMs = 501;
const networkErrorCodes = new Set([
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "ENOTFOUND",
]);
const safeProviderSdkSignals = new Set([
  "AbortError",
  "FAILED_PRECONDITION",
  "INVALID_ARGUMENT",
  "NOT_FOUND",
  "PERMISSION_DENIED",
  "RESOURCE_EXHAUSTED",
  "TimeoutError",
  "UNAUTHENTICATED",
  "UNAVAILABLE",
]);

function cacheKey({ interviewType, level }) {
  return `${interviewType}:${level}`;
}

function getErrorChain(error) {
  const chain = [];
  const seen = new Set();
  let current = error;

  while (
    current &&
    typeof current === "object" &&
    chain.length < maxErrorChainDepth &&
    !seen.has(current)
  ) {
    seen.add(current);
    chain.push(current);
    current = current.cause;
  }

  return chain;
}

function hasErrorSignal(chain, predicate) {
  return chain.some((error) => predicate(error));
}

function errorStatus(error) {
  return Number(error.status ?? error.statusCode);
}

function safeProviderStatusClass(chain) {
  const status = chain.map(errorStatus).find(Number.isInteger);
  if (status >= 400 && status <= 499) return "4xx";
  if (status >= 500 && status <= 599) return "5xx";
  return "unknown";
}

function safeProviderSdkSignal(chain) {
  const signal = chain
    .flatMap((item) => [item.code, item.name])
    .find((value) => safeProviderSdkSignals.has(value));
  return signal || "unknown";
}

function createSafeProviderDiagnostics(error, operation) {
  const chain = getErrorChain(error);
  return {
    operation,
    profile: geminiStructuredProfile,
    sdkSignal: safeProviderSdkSignal(chain),
    statusClass: safeProviderStatusClass(chain),
  };
}

function classifyProviderError(error) {
  const chain = getErrorChain(error);
  const hasStatus = (status) =>
    hasErrorSignal(chain, (item) => errorStatus(item) === status);
  const hasCode = (...codes) =>
    hasErrorSignal(chain, (item) => codes.includes(item.code));

  if (
    hasStatus(429) ||
    hasCode(429, "RESOURCE_EXHAUSTED") ||
    hasErrorSignal(
      chain,
      (item) =>
        typeof item.message === "string" &&
        /RESOURCE_EXHAUSTED|quota/i.test(item.message),
    )
  ) {
    return "provider_quota";
  }

  if (
    hasErrorSignal(
      chain,
      (item) =>
        item.name === "AbortError" ||
        item.name === "TimeoutError" ||
        item.code === "ETIMEDOUT" ||
        item.code === "UND_ERR_CONNECT_TIMEOUT",
    )
  ) {
    return "provider_timeout";
  }

  if (hasStatus(401) || hasCode("UNAUTHENTICATED")) {
    return "provider_authentication";
  }

  if (hasStatus(403) || hasCode("PERMISSION_DENIED")) {
    return "provider_permission";
  }

  if (hasStatus(404) || hasCode("NOT_FOUND")) {
    return "provider_model_not_found";
  }

  if (
    [400, 409, 415, 422].some(hasStatus) ||
    hasCode("FAILED_PRECONDITION", "INVALID_ARGUMENT")
  ) {
    return "provider_rejected";
  }

  if (
    hasErrorSignal(chain, (item) => {
      const status = errorStatus(item);
      return (
        (status >= 500 && status <= 599) ||
        networkErrorCodes.has(item.code) ||
        item.code === "UNAVAILABLE"
      );
    })
  ) {
    return "provider_unavailable";
  }

  return "provider_unknown";
}

function copyAppErrorWithCategory(error, errorCategory, providerDiagnostics) {
  return new AppError(error.code, error.message, {
    errorCategory,
    expose: error.expose,
    fields: error.fields,
    providerDiagnostics,
    status: error.status,
  });
}

function normalizeProviderError(error, providerDiagnostics) {
  if (error instanceof AppError) {
    if (error.errorCategory) {
      return copyAppErrorWithCategory(
        error,
        error.errorCategory,
        providerDiagnostics,
      );
    }

    const categoryByCode = {
      AI_PROVIDER_TIMEOUT: "provider_timeout",
      AI_PROVIDER_UNAVAILABLE: "provider_unknown",
      AI_QUOTA_EXCEEDED: "provider_quota",
      INVALID_AI_RESPONSE: "provider_invalid_response",
    };
    const errorCategory = categoryByCode[error.code];
    return errorCategory
      ? copyAppErrorWithCategory(error, errorCategory, providerDiagnostics)
      : error;
  }

  const errorCategory = classifyProviderError(error);

  if (errorCategory === "provider_quota") {
    return new AppError(
      "AI_QUOTA_EXCEEDED",
      "AI practice is temporarily unavailable. Your saved work is safe; try again later.",
      { errorCategory, expose: true, providerDiagnostics, status: 429 },
    );
  }

  if (errorCategory === "provider_timeout") {
    return new AppError(
      "AI_PROVIDER_TIMEOUT",
      "AI practice is taking longer than expected. Please try again.",
      { errorCategory, expose: true, providerDiagnostics, status: 504 },
    );
  }

  return new AppError(
    "AI_PROVIDER_UNAVAILABLE",
    "AI practice is temporarily unavailable. Please try again.",
    { errorCategory, expose: true, providerDiagnostics, status: 502 },
  );
}

function defaultSleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function retryDelayMs(random) {
  const randomizedDelay =
    minimumRetryDelayMs + Math.floor(random() * retryDelayRangeMs);
  return Math.min(1_000, Math.max(minimumRetryDelayMs, randomizedDelay));
}

function createProvider({
  aiProvider,
  geminiApiKey,
  geminiModel,
  generateContent,
  timeoutMs,
}) {
  if (aiProvider === "mock") {
    return createMockAiProvider();
  }

  if (!geminiApiKey && !generateContent) {
    throw new AppError(
      "AI_PROVIDER_NOT_CONFIGURED",
      "AI provider is not configured.",
    );
  }

  return createGeminiProvider({
    geminiApiKey,
    generateContent,
    model: geminiModel,
    timeoutMs,
  });
}

export function createAiProviderService({
  aiProvider = "mock",
  geminiApiKey,
  geminiModel = "gemini-3.6-flash",
  generateContent,
  monotonicNow = () => performance.now(),
  now = Date.now,
  questionCacheTtlMs = defaultQuestionCacheTtlMs,
  random = Math.random,
  sleep = defaultSleep,
  timeoutMs = 8000,
} = {}) {
  if (
    !Number.isInteger(questionCacheTtlMs) ||
    questionCacheTtlMs < 1 ||
    questionCacheTtlMs > 5 * 60_000
  ) {
    throw new TypeError(
      "questionCacheTtlMs must be an integer between 1 and 300000.",
    );
  }

  const provider = createProvider({
    aiProvider,
    geminiApiKey,
    geminiModel,
    generateContent,
    timeoutMs,
  });
  const questionCache = new Map();
  const getProviderDiagnostics = (error, operation) =>
    aiProvider === "gemini"
      ? createSafeProviderDiagnostics(error, operation)
      : undefined;

  async function executeProviderOperation(
    operationName,
    operation,
    { retryInvalidResponse = false, retryUnavailable },
  ) {
    const startedAt = monotonicNow();

    try {
      return await operation(timeoutMs);
    } catch (error) {
      const normalizedError = normalizeProviderError(
        error,
        getProviderDiagnostics(error, operationName),
      );

      if (!(
        (retryUnavailable &&
          normalizedError.errorCategory === "provider_unavailable") ||
        (retryInvalidResponse &&
          normalizedError.errorCategory === "provider_invalid_response")
      )) {
        throw normalizedError;
      }

      const delayMs = retryDelayMs(random);
      const remainingAfterDelay =
        timeoutMs - (monotonicNow() - startedAt) - delayMs;

      if (remainingAfterDelay < minimumRetryBudgetMs) {
        throw normalizedError;
      }

      await sleep(delayMs);
      const remainingTimeoutMs = Math.floor(
        timeoutMs - (monotonicNow() - startedAt),
      );

      if (remainingTimeoutMs < minimumRetryBudgetMs) {
        throw normalizedError;
      }

      try {
        return await operation(remainingTimeoutMs);
      } catch (retryError) {
        throw normalizeProviderError(
          retryError,
          getProviderDiagnostics(retryError, operationName),
        );
      }
    }
  }

  return {
    async generateAdaptiveQuestion(input) {
      const validatedInput = validateAdaptiveQuestionInput(input);
      return executeProviderOperation(
        "adaptive_question",
        async (attemptTimeoutMs) =>
          validateAdaptiveQuestionOutput(
            await provider.generateAdaptiveQuestion(validatedInput, {
              timeoutMs: attemptTimeoutMs,
            }),
            validatedInput,
          ),
        { retryUnavailable: true },
      );
    },

    async analyzeJobTarget(input) {
      const validatedInput = validateJobTargetAnalysisInput(input);

      return executeProviderOperation(
        "job_target_analysis",
        async (attemptTimeoutMs) =>
          validateJobTargetAnalysisOutput(
            await provider.analyzeJobTarget(validatedInput, {
              timeoutMs: attemptTimeoutMs,
            }),
          ),
        { retryUnavailable: true },
      );
    },

    async extractProjectDrafts(input) {
      const validatedInput = validateProjectExtractionInput(input);
      return executeProviderOperation(
        "project_extraction",
        async (attemptTimeoutMs) =>
          validateProjectExtractionOutput(
            await provider.extractProjectDrafts(validatedInput, {
              timeoutMs: attemptTimeoutMs,
            }),
            validatedInput.resumeContext,
          ),
        { retryInvalidResponse: true, retryUnavailable: true },
      );
    },

    async generateQuestion(input) {
      const validatedInput = validateQuestionInput(input);
      const canUseCache =
        !validatedInput.resumeContext &&
        validatedInput.previousQuestions.length === 0;
      const key = cacheKey(validatedInput);
      const cached = questionCache.get(key);

      if (canUseCache && cached && cached.expiresAt > now()) {
        return cached.question;
      }

      if (cached) {
        questionCache.delete(key);
      }

      const question = await executeProviderOperation(
        "question_generation",
        async (attemptTimeoutMs) =>
          validateQuestionOutput(
            await provider.generateQuestion(validatedInput, {
              timeoutMs: attemptTimeoutMs,
            }),
          ),
        { retryUnavailable: true },
      );

      if (canUseCache) {
        questionCache.set(key, {
          expiresAt: now() + questionCacheTtlMs,
          question,
        });
      }

      return question;
    },

    async evaluateAnswer(input, { retryUnavailable = false } = {}) {
      const validatedInput = validateEvaluationInput(input);

      return executeProviderOperation(
        "v1_evaluation",
        async (attemptTimeoutMs) =>
          validateEvaluationOutput(
            await provider.evaluateAnswer(validatedInput, {
              timeoutMs: attemptTimeoutMs,
            }),
          ),
        { retryUnavailable },
      );
    },

    async evaluateV2Answer(input, { retryUnavailable = false } = {}) {
      const validatedInput = validateV2EvaluationInput(input);
      return executeProviderOperation(
        "v2_evaluation",
        async (attemptTimeoutMs) =>
          validateV2EvaluationOutput(
            await provider.evaluateV2Answer(validatedInput, {
              timeoutMs: attemptTimeoutMs,
            }),
            validatedInput,
          ),
        { retryUnavailable },
      );
    },
  };
}
