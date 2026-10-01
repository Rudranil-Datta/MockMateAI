import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App.jsx";

const getAnalyticsSummary = vi.hoisted(() => vi.fn());
const interviewApi = vi.hoisted(() => ({
  completeInterview: vi.fn(),
  generateNextQuestion: vi.fn(),
  getInterview: vi.fn(),
  startInterview: vi.fn(),
  submitTextAnswer: vi.fn(),
  submitVoiceAnswer: vi.fn(),
}));
const listResumes = vi.hoisted(() => vi.fn());

vi.mock("./api/analyticsApi.js", () => ({ getAnalyticsSummary }));
vi.mock("./api/interviewApi.js", () => interviewApi);
vi.mock("./api/resumeApi.js", () => ({ listResumes }));
vi.mock("./hooks/useAuth.js", () => ({
  default: () => ({
    authError: "",
    isAuthenticated: true,
    isAuthLoading: false,
    logout: vi.fn(),
    retrySession: vi.fn(),
    user: { email: "asha@example.com", name: "Asha Kumar" },
  }),
}));

const interviewId = "68d28d4fe533c5c96697b002";
const completedAt = "2026-10-01T10:00:00.000Z";
const startedAt = "2026-10-01T09:55:00.000Z";
const feedback = {
  accuracyScore: 78,
  clarityScore: 76,
  confidenceScore: 74,
  improvements: ["Add an example."],
  nextStep: "Practise a concise example.",
  overallScore: 76,
  strengths: ["Explains the core idea."],
};
const emptyAnalytics = {
  recentSessions: [],
  summary: {
    averageAccuracyScore: 0,
    averageClarityScore: 0,
    averageConfidenceScore: 0,
    averageOverallScore: 0,
    completedSessions: 0,
  },
  trend: [],
  typeAverages: [],
};
const populatedAnalytics = {
  recentSessions: [
    {
      completedAt,
      id: interviewId,
      interviewType: "DSA",
      level: "intermediate",
      overallScore: 76,
    },
  ],
  summary: {
    averageAccuracyScore: 78,
    averageClarityScore: 76,
    averageConfidenceScore: 74,
    averageOverallScore: 76,
    completedSessions: 1,
  },
  trend: [{ completedAt, overallScore: 76 }],
  typeAverages: [{ averageOverallScore: 76, interviewType: "DSA" }],
};
const completedInterview = {
  interview: {
    completedAt,
    id: interviewId,
    interviewType: "DSA",
    level: "intermediate",
    questions: [
      {
        answers: [
          {
            feedback,
            id: "answer-123",
            inputMode: "text",
            submittedAt: "2026-10-01T09:58:00.000Z",
            text: "A stack stores values in last-in, first-out order.",
          },
        ],
        id: "question-123",
        order: 1,
        prompt: "Explain stacks.",
      },
    ],
    startedAt,
    status: "completed",
    summary: {
      accuracyScore: 78,
      clarityScore: 76,
      confidenceScore: 74,
      improvements: ["Add an example."],
      overallScore: 76,
      recommendation: "Practise a concise example.",
      strengths: ["Explains the core idea."],
    },
  },
};

describe("critical client journey", () => {
  beforeEach(() => {
    getAnalyticsSummary.mockReset();
    Object.values(interviewApi).forEach((mock) => mock.mockReset());
    listResumes.mockReset();

    getAnalyticsSummary
      .mockResolvedValueOnce(emptyAnalytics)
      .mockResolvedValueOnce(populatedAnalytics);
    listResumes.mockResolvedValue([]);
    interviewApi.startInterview.mockResolvedValue({
      interview: {
        id: interviewId,
        interviewType: "DSA",
        level: "intermediate",
        startedAt,
        status: "active",
      },
      question: {
        id: "question-123",
        order: 1,
        prompt: "Explain stacks.",
      },
    });
    interviewApi.submitTextAnswer.mockResolvedValue({
      answer: {
        id: "answer-123",
        inputMode: "text",
        submittedAt: "2026-10-01T09:58:00.000Z",
        text: "A stack stores values in last-in, first-out order.",
      },
      feedback,
    });
    interviewApi.completeInterview.mockResolvedValue({
      interview: {
        completedAt,
        id: interviewId,
        status: "completed",
        summary: { overallScore: 76 },
      },
    });
    interviewApi.getInterview.mockResolvedValue(completedInterview);
  });

  it("completes typed practice and exposes saved history through real routes", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "No completed sessions yet",
      }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("link", { name: "Start your first session" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Start a mock interview" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /DSA/i }));
    fireEvent.click(screen.getByLabelText(/Intermediate/i));
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

    expect(await screen.findByText("Explain stacks.")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: {
        value: "A stack stores values in last-in, first-out order.",
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit for feedback" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Feedback" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "End session early" }));

    expect(
      await screen.findByRole("heading", { name: "Your practice baseline" }),
    ).toBeVisible();
    expect(interviewApi.completeInterview).toHaveBeenCalledWith({
      interviewId,
    });
    expect(interviewApi.getInterview).toHaveBeenCalledWith({
      interviewId,
      signal: expect.any(AbortSignal),
    });

    fireEvent.click(screen.getByRole("link", { name: "View dashboard" }));

    expect(
      await screen.findByRole("heading", { name: "Review saved practice" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "View result" })).toHaveAttribute(
      "href",
      `/practice/${interviewId}/results`,
    );
    await waitFor(() => expect(getAnalyticsSummary).toHaveBeenCalledTimes(2));
  });
});
