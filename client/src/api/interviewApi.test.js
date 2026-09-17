import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  completeInterview,
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
      interviewType: "DSA",
      level: "intermediate",
    });

    expect(apiRequest).toHaveBeenCalledWith("interviews", {
      body: {
        interviewType: "DSA",
        level: "intermediate",
      },
      method: "POST",
    });
  });

  it("includes optional resume id only when provided", () => {
    startInterview({
      interviewType: "HR",
      level: "beginner",
      resumeId: "resume-123",
    });

    expect(apiRequest).toHaveBeenCalledWith("interviews", {
      body: {
        interviewType: "HR",
        level: "beginner",
        resumeId: "resume-123",
      },
      method: "POST",
    });
  });

  it("maps typed answer input to documented persistence request", () => {
    submitTextAnswer({
      interviewId: "interview-123",
      questionId: "question-123",
      text: "Use a stack.",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "interviews/interview-123/answers",
      {
        body: {
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
});
