import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  completeInterview,
  generateNextQuestion,
  getInterview,
  startInterview,
  submitTextAnswer,
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
      },
    );
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
      },
    );
  });
});
