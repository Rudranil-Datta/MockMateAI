import { describe, expect, it, vi } from "vitest";

import { createAiProviderService } from "../../src/services/aiProviderService.js";

const dsaInput = {
  interviewType: "DSA",
  level: "intermediate",
  previousQuestions: [],
};

const evaluationInput = {
  answer: "A hash map stores key-value pairs in buckets.",
  interviewType: "DSA",
  level: "intermediate",
  question: "Explain how a hash map handles collisions.",
};

const validFeedback = {
  accuracyScore: 78,
  clarityScore: 76,
  confidenceScore: 74,
  improvements: ["Add a concrete collision example."],
  nextStep: "Practise explaining chaining and open addressing.",
  overallScore: 76,
  strengths: ["Explains bucket-based storage clearly."],
};

describe("aiProviderService", () => {
  it("returns deterministic mock questions for all documented types", async () => {
    const service = createAiProviderService({ aiProvider: "mock" });

    await expect(service.generateQuestion(dsaInput)).resolves.toEqual({
      prompt:
        "Explain how a hash map handles collisions and when lookup performance can degrade.",
    });
    await expect(
      service.generateQuestion({
        interviewType: "HR",
        level: "beginner",
        previousQuestions: [],
      }),
    ).resolves.toEqual({
      prompt: "Tell me about yourself and why you want this role.",
    });
    await expect(
      service.generateQuestion({
        interviewType: "System Design",
        level: "advanced",
        previousQuestions: [],
      }),
    ).resolves.toEqual({
      prompt:
        "Design a globally distributed notification service. Explain consistency, delivery guarantees, and failure handling.",
    });
  });

  it("uses structured Gemini output through the shared question contract", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: '{"prompt":"Explain how a database index changes read and write trade-offs."}',
    });
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
      geminiModel: "gemini-test-model",
      timeoutMs: 5000,
    });

    await expect(service.generateQuestion(dsaInput)).resolves.toEqual({
      prompt: "Explain how a database index changes read and write trade-offs.",
    });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          candidateCount: 1,
          maxOutputTokens: 240,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        }),
        model: "gemini-test-model",
      }),
    );
  });

  it("requires safe resume grounding only for context-aware questions", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: '{"prompt":"How would you test a Node.js queue implementation?"}',
    });
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
    });

    await service.generateQuestion({
      ...dsaInput,
      resumeContext: "Backend engineer using Node.js and MongoDB.",
    });
    await service.generateQuestion(dsaInput);

    const contextPrompt = generateContent.mock.calls[0][0].contents;
    const genericPrompt = generateContent.mock.calls[1][0].contents;
    expect(contextPrompt).toContain(
      "Meaningfully tailor the question using at least one relevant non-personal technical skill, technology, or project detail from this context.",
    );
    expect(contextPrompt).toContain(
      "Use only details explicitly present in the context; do not invent experience.",
    );
    expect(contextPrompt).toContain(
      "Do not reveal names, contact details, or other personal data.",
    );
    expect(genericPrompt).not.toContain("Meaningfully tailor the question");
    expect(genericPrompt).not.toContain("resume context");
  });

  it("reuses only compatible context-free questions", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: '{"prompt":"How would you test a queue implementation?"}',
    });
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
    });

    await service.generateQuestion(dsaInput);
    await service.generateQuestion(dsaInput);
    await service.generateQuestion({
      ...dsaInput,
      resumeContext: "Backend work",
    });

    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("expires cached questions at the configured bounded TTL", async () => {
    let currentTime = 1_000;
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce({ text: '{"prompt":"First generic question?"}' })
      .mockResolvedValueOnce({ text: '{"prompt":"Fresh generic question?"}' });
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
      now: () => currentTime,
      questionCacheTtlMs: 1_000,
    });

    await expect(service.generateQuestion(dsaInput)).resolves.toEqual({
      prompt: "First generic question?",
    });
    currentTime = 1_999;
    await expect(service.generateQuestion(dsaInput)).resolves.toEqual({
      prompt: "First generic question?",
    });
    currentTime = 2_000;
    await expect(service.generateQuestion(dsaInput)).resolves.toEqual({
      prompt: "Fresh generic question?",
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("rejects unsafe cache TTL configuration", () => {
    expect(() =>
      createAiProviderService({ aiProvider: "mock", questionCacheTtlMs: 0 }),
    ).toThrow("questionCacheTtlMs must be an integer between 1 and 300000.");
  });

  it("rejects invalid input and malformed provider output", async () => {
    const mockService = createAiProviderService({ aiProvider: "mock" });
    const malformedService = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi.fn().mockResolvedValue({ text: '{"prompt":""}' }),
    });

    await expect(
      mockService.generateQuestion({ ...dsaInput, interviewType: "Coding" }),
    ).rejects.toMatchObject({ code: "INVALID_AI_REQUEST", status: 400 });
    await expect(
      mockService.generateQuestion({
        ...dsaInput,
        previousQuestions: ["   "],
      }),
    ).rejects.toMatchObject({ code: "INVALID_AI_REQUEST", status: 400 });
    await expect(
      mockService.generateQuestion({
        ...dsaInput,
        resumeContext: "x".repeat(2001),
      }),
    ).rejects.toMatchObject({ code: "INVALID_AI_REQUEST", status: 400 });
    await expect(
      malformedService.generateQuestion(dsaInput),
    ).rejects.toMatchObject({
      code: "INVALID_AI_RESPONSE",
      status: 502,
    });
  });

  it("normalizes quota, timeout, and provider failures", async () => {
    const quotaService = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi.fn().mockRejectedValue({
        code: "RESOURCE_EXHAUSTED",
        message: "Quota exhausted",
        status: 429,
      }),
    });
    const timeoutService = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi.fn().mockRejectedValue({ name: "TimeoutError" }),
    });
    const unavailableService = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi.fn().mockRejectedValue(new Error("Network failed")),
    });
    await expect(quotaService.generateQuestion(dsaInput)).rejects.toMatchObject(
      {
        code: "AI_QUOTA_EXCEEDED",
        errorCategory: "provider_quota",
        status: 429,
      },
    );
    await expect(
      timeoutService.generateQuestion(dsaInput),
    ).rejects.toMatchObject({
      code: "AI_PROVIDER_TIMEOUT",
      errorCategory: "provider_timeout",
      status: 504,
    });
    await expect(
      unavailableService.generateQuestion(dsaInput),
    ).rejects.toMatchObject({
      code: "AI_PROVIDER_UNAVAILABLE",
      errorCategory: "provider_unknown",
      status: 502,
    });
  });

  it("retries one unavailable question attempt inside one timeout budget", async () => {
    let currentTime = 1_000;
    const sleep = vi.fn(async (delayMs) => {
      currentTime += delayMs;
    });
    const generateContent = vi
      .fn()
      .mockImplementationOnce(async () => {
        currentTime += 2_000;
        throw { status: 503 };
      })
      .mockResolvedValueOnce({
        text: '{"prompt":"Explain bounded retry behavior."}',
      });
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockImplementation((timeoutMs) => ({ timeoutMs }));
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
      monotonicNow: () => currentTime,
      random: () => 0,
      sleep,
      timeoutMs: 20_000,
    });

    await expect(service.generateQuestion(dsaInput)).resolves.toEqual({
      prompt: "Explain bounded retry behavior.",
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(500);
    expect(timeout).toHaveBeenNthCalledWith(1, 20_000);
    expect(timeout).toHaveBeenNthCalledWith(2, 17_500);
    timeout.mockRestore();
  });

  it("returns the existing safe error after one unavailable retry", async () => {
    const generateContent = vi.fn().mockRejectedValue({ code: "UNAVAILABLE" });
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
      random: () => 1,
      sleep: vi.fn().mockResolvedValue(undefined),
      timeoutMs: 20_000,
    });

    await expect(service.generateQuestion(dsaInput)).rejects.toMatchObject({
      code: "AI_PROVIDER_UNAVAILABLE",
      errorCategory: "provider_unavailable",
      status: 502,
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("returns the second safe category when the retry fails differently", async () => {
    const generateContent = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockRejectedValueOnce({ name: "TimeoutError" });
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
      random: () => 0,
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    await expect(service.generateQuestion(dsaInput)).rejects.toMatchObject({
      code: "AI_PROVIDER_TIMEOUT",
      errorCategory: "provider_timeout",
      status: 504,
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("does not retry malformed or empty provider output", async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: "" });
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
    });

    await expect(service.generateQuestion(dsaInput)).rejects.toMatchObject({
      code: "INVALID_AI_RESPONSE",
      errorCategory: "provider_invalid_response",
    });
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it.each([
    [{ status: 429 }, "provider_quota"],
    [{ name: "TimeoutError" }, "provider_timeout"],
    [{ status: 401 }, "provider_authentication"],
    [{ status: 403 }, "provider_permission"],
    [{ status: 404 }, "provider_model_not_found"],
    [{ status: 400 }, "provider_rejected"],
    [{ code: "UNKNOWN" }, "provider_unknown"],
  ])("does not retry excluded failure %s", async (failure, errorCategory) => {
    const generateContent = vi.fn().mockRejectedValue(failure);
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
    });

    await expect(service.generateQuestion(dsaInput)).rejects.toMatchObject({
      errorCategory,
    });
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it("does not retry unavailable failures without minimum remaining budget", async () => {
    let currentTime = 0;
    const sleep = vi.fn();
    const generateContent = vi.fn().mockImplementation(async () => {
      currentTime = 17_000;
      throw { status: 503 };
    });
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
      monotonicNow: () => currentTime,
      random: () => 0,
      sleep,
      timeoutMs: 20_000,
    });

    await expect(service.generateQuestion(dsaInput)).rejects.toMatchObject({
      errorCategory: "provider_unavailable",
    });
    expect(generateContent).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries unavailable evaluation only when the caller opts in", async () => {
    const defaultGenerateContent = vi
      .fn()
      .mockRejectedValue({ code: "UNAVAILABLE" });
    const defaultService = createAiProviderService({
      aiProvider: "gemini",
      generateContent: defaultGenerateContent,
    });
    const optedInGenerateContent = vi
      .fn()
      .mockRejectedValueOnce({ code: "UNAVAILABLE" })
      .mockResolvedValueOnce({ text: JSON.stringify(validFeedback) });
    const optedInService = createAiProviderService({
      aiProvider: "gemini",
      generateContent: optedInGenerateContent,
      random: () => 0,
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      defaultService.evaluateAnswer(evaluationInput),
    ).rejects.toMatchObject({ errorCategory: "provider_unavailable" });
    await expect(
      optedInService.evaluateAnswer(evaluationInput, {
        retryUnavailable: true,
      }),
    ).resolves.toEqual(validFeedback);
    expect(defaultGenerateContent).toHaveBeenCalledOnce();
    expect(optedInGenerateContent).toHaveBeenCalledTimes(2);
  });

  it.each([
    [{ cause: { statusCode: 429 } }, "provider_quota"],
    [{ cause: { code: "ETIMEDOUT" } }, "provider_timeout"],
    [{ status: 401 }, "provider_authentication"],
    [{ code: "PERMISSION_DENIED" }, "provider_permission"],
    [{ statusCode: "404" }, "provider_model_not_found"],
    [{ code: "INVALID_ARGUMENT" }, "provider_rejected"],
    [{ cause: { code: "ECONNRESET" } }, "provider_unavailable"],
    [{ code: "UNRECOGNIZED_PROVIDER_FAILURE" }, "provider_unknown"],
  ])("classifies provider failure %j as %s", async (failure, errorCategory) => {
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi.fn().mockRejectedValue(failure),
    });

    await expect(service.generateQuestion(dsaInput)).rejects.toMatchObject({
      code:
        errorCategory === "provider_quota"
          ? "AI_QUOTA_EXCEEDED"
          : errorCategory === "provider_timeout"
            ? "AI_PROVIDER_TIMEOUT"
            : "AI_PROVIDER_UNAVAILABLE",
      errorCategory,
    });
  });

  it("uses fixed precedence and handles cyclic causes", async () => {
    const failure = { status: 403 };
    failure.cause = { code: "RESOURCE_EXHAUSTED", cause: failure };
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi.fn().mockRejectedValue(failure),
    });

    await expect(service.generateQuestion(dsaInput)).rejects.toMatchObject({
      code: "AI_QUOTA_EXCEEDED",
      errorCategory: "provider_quota",
    });
  });

  it.each([
    [{ text: "" }],
    [{ text: "not-json" }],
    [{ text: '{"prompt":""}' }],
  ])(
    "classifies malformed provider output without changing its public contract",
    async (output) => {
      const service = createAiProviderService({
        aiProvider: "gemini",
        generateContent: vi.fn().mockResolvedValue(output),
      });

      await expect(service.generateQuestion(dsaInput)).rejects.toMatchObject({
        code: "INVALID_AI_RESPONSE",
        errorCategory: "provider_invalid_response",
        status: 502,
      });
    },
  );

  it("returns deterministic mock feedback through the shared evaluation contract", async () => {
    const service = createAiProviderService({ aiProvider: "mock" });

    await expect(service.evaluateAnswer(evaluationInput)).resolves.toEqual({
      accuracyScore: 78,
      clarityScore: 76,
      confidenceScore: 74,
      improvements: ["Add one concrete example to support your explanation."],
      nextStep: "Practise giving a concise answer with a concrete example.",
      overallScore: 76,
      strengths: ["Explains the core idea clearly."],
    });
  });

  it("uses structured Gemini feedback through the shared evaluation contract", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify(validFeedback),
    });
    const service = createAiProviderService({
      aiProvider: "gemini",
      generateContent,
      geminiModel: "gemini-test-model",
      timeoutMs: 5000,
    });

    await expect(service.evaluateAnswer(evaluationInput)).resolves.toEqual(
      validFeedback,
    );
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          maxOutputTokens: 600,
          responseMimeType: "application/json",
        }),
        model: "gemini-test-model",
      }),
    );
  });

  it("rejects malformed evaluation output and normalizes evaluation failures", async () => {
    const malformedService = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify({ ...validFeedback, overallScore: 101 }),
      }),
    });
    const quotaService = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi.fn().mockRejectedValue({
        code: "RESOURCE_EXHAUSTED",
        message: "Quota exhausted",
        status: 429,
      }),
    });
    const timeoutService = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi.fn().mockRejectedValue({ name: "TimeoutError" }),
    });
    const unavailableService = createAiProviderService({
      aiProvider: "gemini",
      generateContent: vi.fn().mockRejectedValue(new Error("Network failed")),
    });

    await expect(
      malformedService.evaluateAnswer(evaluationInput),
    ).rejects.toMatchObject({ code: "INVALID_AI_RESPONSE", status: 502 });
    await expect(
      quotaService.evaluateAnswer(evaluationInput),
    ).rejects.toMatchObject({
      code: "AI_QUOTA_EXCEEDED",
      status: 429,
    });
    await expect(
      timeoutService.evaluateAnswer(evaluationInput),
    ).rejects.toMatchObject({
      code: "AI_PROVIDER_TIMEOUT",
      status: 504,
    });
    await expect(
      unavailableService.evaluateAnswer(evaluationInput),
    ).rejects.toMatchObject({
      code: "AI_PROVIDER_UNAVAILABLE",
      status: 502,
    });
  });
});
