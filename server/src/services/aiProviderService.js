import { AppError } from "../utils/AppError.js";
import {
  validateEvaluationInput,
  validateEvaluationOutput,
  validateQuestionInput,
  validateQuestionOutput,
} from "../validators/aiSchemas.js";
import { createGeminiProvider } from "./geminiProvider.js";
import { createMockAiProvider } from "./mockAiProvider.js";

const defaultQuestionCacheTtlMs = 60_000;

function cacheKey({ interviewType, level }) {
  return `${interviewType}:${level}`;
}

function isQuotaError(error) {
  return (
    error?.status === 429 ||
    error?.code === 429 ||
    error?.code === "RESOURCE_EXHAUSTED" ||
    /RESOURCE_EXHAUSTED|quota/i.test(error?.message || "")
  );
}

function isTimeoutError(error) {
  return error?.name === "AbortError" || error?.name === "TimeoutError";
}

function normalizeProviderError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (isQuotaError(error)) {
    return new AppError(
      "AI_QUOTA_EXCEEDED",
      "AI practice is temporarily unavailable. Your saved work is safe; try again later.",
      { expose: true, status: 429 },
    );
  }

  if (isTimeoutError(error)) {
    return new AppError(
      "AI_PROVIDER_TIMEOUT",
      "AI practice is taking longer than expected. Please try again.",
      { expose: true, status: 504 },
    );
  }

  return new AppError(
    "AI_PROVIDER_UNAVAILABLE",
    "AI practice is temporarily unavailable. Please try again.",
    { expose: true, status: 502 },
  );
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
  questionCacheTtlMs = defaultQuestionCacheTtlMs,
  timeoutMs = 8000,
} = {}) {
  const provider = createProvider({
    aiProvider,
    geminiApiKey,
    geminiModel,
    generateContent,
    timeoutMs,
  });
  const questionCache = new Map();

  return {
    async generateQuestion(input) {
      const validatedInput = validateQuestionInput(input);
      const canUseCache =
        !validatedInput.resumeContext &&
        validatedInput.previousQuestions.length === 0;
      const key = cacheKey(validatedInput);
      const cached = questionCache.get(key);

      if (canUseCache && cached && cached.expiresAt > Date.now()) {
        return cached.question;
      }

      try {
        const question = validateQuestionOutput(
          await provider.generateQuestion(validatedInput),
        );

        if (canUseCache) {
          questionCache.set(key, {
            expiresAt: Date.now() + questionCacheTtlMs,
            question,
          });
        }

        return question;
      } catch (error) {
        throw normalizeProviderError(error);
      }
    },

    async evaluateAnswer(input) {
      const validatedInput = validateEvaluationInput(input);

      try {
        return validateEvaluationOutput(
          await provider.evaluateAnswer(validatedInput),
        );
      } catch (error) {
        throw normalizeProviderError(error);
      }
    },
  };
}
