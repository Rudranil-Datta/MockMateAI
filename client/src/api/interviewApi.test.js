import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  completeInterview,
  generateNextQuestion,
  getInterview,
  startInterview,
  submitTextAnswer,
  submitVoiceAnswer,
} from "./interviewApi.js";

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock("./httpClient.js", () => ({ apiRequest }));

describe("interviewApi", () => {
  beforeEach(() => {
    apiRequest.mockClear();
  });

  it("maps interview start input to documented request", () => {
    startInterview({
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
      interviewType: "DSA",
      level: "intermediate",
    });

    expect(apiRequest).toHaveBeenCalledWith("interviews", {
      body: {
        idempotencyKey: "00000000-0000-4000-8000-000000000001",
        interviewType: "DSA",
        level: "intermediate",
      },
      method: "POST",
      timeoutMs: 25_000,
    });
  });

  it("includes optional resume id only when provided", () => {
    startInterview({
      idempotencyKey: "00000000-0000-4000-8000-000000000002",
      interviewType: "HR",
      level: "beginner",
      resumeId: "resume-123",
    });

    expect(apiRequest).toHaveBeenCalledWith("interviews", {
      body: {
        idempotencyKey: "00000000-0000-4000-8000-000000000002",
        interviewType: "HR",
        level: "beginner",
        resumeId: "resume-123",
      },
      method: "POST",
      timeoutMs: 25_000,
    });
  });

  it("maps typed answer input to documented persistence request", () => {
    submitTextAnswer({
      idempotencyKey: "00000000-0000-4000-8000-000000000004",
      interviewId: "interview-123",
      questionId: "question-123",
      text: "Use a stack.",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "interviews/interview-123/answers",
      {
        body: {
          idempotencyKey: "00000000-0000-4000-8000-000000000004",
          questionId: "question-123",
          text: "Use a stack.",
        },
        method: "POST",
        timeoutMs: 25_000,
      },
    );
  });

  it("uploads a supported recording and validates saved voice feedback", async () => {
    const audioBlob = new Blob(["voice"], { type: "audio/mp4" });
    apiRequest.mockResolvedValueOnce({
      answer: {
        id: "answer-123",
        inputMode: "voice",
        submittedAt: "2026-09-27T00:00:00.000Z",
        text: "  Spoken answer.  ",
      },
      feedback: {
        accuracyScore: 80,
        clarityScore: 81,
        confidenceScore: 79,
        improvements: ["Add an example."],
        nextStep: "Practise once more.",
        overallScore: 80,
        strengths: ["Clear structure."],
      },
    });

    await expect(
      submitVoiceAnswer({
        audioBlob,
        idempotencyKey: "00000000-0000-4000-8000-000000000005",
        interviewId: "interview-123",
        questionId: "question-123",
      }),
    ).resolves.toEqual({
      answer: {
        id: "answer-123",
        inputMode: "voice",
        submittedAt: "2026-09-27T00:00:00.000Z",
        text: "Spoken answer.",
      },
      feedback: {
        accuracyScore: 80,
        clarityScore: 81,
        confidenceScore: 79,
        improvements: ["Add an example."],
        nextStep: "Practise once more.",
        overallScore: 80,
        strengths: ["Clear structure."],
      },
    });

    const [, options] = apiRequest.mock.calls[0];
    expect(apiRequest).toHaveBeenCalledWith(
      "interviews/interview-123/voice-answers",
      expect.objectContaining({ method: "POST", timeoutMs: 20_000 }),
    );
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("questionId")).toBe("question-123");
    expect(options.body.get("idempotencyKey")).toBe(
      "00000000-0000-4000-8000-000000000005",
    );
    expect(options.body.get("audio")).toEqual(expect.any(Blob));
  });

  it("rejects malformed voice-answer responses", async () => {
    apiRequest.mockResolvedValueOnce({
      answer: { inputMode: "voice", text: "" },
      feedback: {},
    });

    await expect(
      submitVoiceAnswer({
        audioBlob: new Blob(["voice"], { type: "audio/webm" }),
        interviewId: "interview-123",
      }),
    ).rejects.toThrow("unexpected response");
  });

  it("maps session retrieval and completion requests", () => {
    getInterview({ interviewId: "interview-123" });
    completeInterview({ interviewId: "interview-123" });

    expect(apiRequest).toHaveBeenNthCalledWith(1, "interviews/interview-123", {
      signal: undefined,
    });
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "interviews/interview-123/complete",
      { method: "POST" },
    );
  });

  it("maps next-question request to documented route", () => {
    generateNextQuestion({
      idempotencyKey: "00000000-0000-4000-8000-000000000003",
      interviewId: "interview-123",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "interviews/interview-123/questions",
      {
        body: {
          idempotencyKey: "00000000-0000-4000-8000-000000000003",
        },
        method: "POST",
        timeoutMs: 25_000,
      },
    );
  });
});
