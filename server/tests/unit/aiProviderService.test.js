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
        status: 429,
      },
    );
    await expect(
      timeoutService.generateQuestion(dsaInput),
    ).rejects.toMatchObject({
      code: "AI_PROVIDER_TIMEOUT",
      status: 504,
    });
    await expect(
      unavailableService.generateQuestion(dsaInput),
    ).rejects.toMatchObject({
      code: "AI_PROVIDER_UNAVAILABLE",
      status: 502,
    });
  });

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
