import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InterviewResultPage from "./InterviewResultPage.jsx";

const getInterview = vi.hoisted(() => vi.fn());

vi.mock("../api/interviewApi.js", () => ({ getInterview }));

function renderResultPage() {
  return render(
    <MemoryRouter initialEntries={["/practice/session-123/results"]}>
      <Routes>
        <Route
          element={<InterviewResultPage />}
          path="/practice/:interviewId/results"
        />
      </Routes>
    </MemoryRouter>,
  );
}

function completedInterview() {
  return {
    interview: {
      completedAt: "2026-09-17T00:00:00.000Z",
      id: "session-123",
      interviewType: "DSA",
      level: "intermediate",
      questions: [
        {
          answers: [
            {
              feedback: {
                accuracyScore: 78,
                clarityScore: 76,
                confidenceScore: 74,
                improvements: ["Add collision examples."],
                nextStep: "Compare chaining with open addressing.",
                overallScore: 76,
                strengths: ["Explains buckets clearly."],
              },
              id: "answer-123",
              inputMode: "text",
              submittedAt: "2026-09-17T00:00:00.000Z",
              text: "Use buckets.",
            },
          ],
          id: "question-123",
          order: 1,
          prompt: "Explain hash maps.",
        },
      ],
      startedAt: "2026-09-16T23:50:00.000Z",
      status: "completed",
      summary: {
        accuracyScore: 78,
        clarityScore: 76,
        confidenceScore: 74,
        improvements: ["Add collision examples."],
        overallScore: 76,
        recommendation: "Add a concrete example.",
        strengths: ["Explains buckets clearly."],
      },
    },
  };
}

describe("InterviewResultPage", () => {
  beforeEach(() => {
    getInterview.mockReset();
  });

  it("loads saved completed interview result", async () => {
    getInterview.mockResolvedValueOnce(completedInterview());

    renderResultPage();

    expect(await screen.findByText("Your practice baseline")).toBeVisible();
    expect(getInterview).toHaveBeenCalledWith({
      interviewId: "session-123",
      signal: expect.any(AbortSignal),
    });
    expect(screen.getAllByText("76/100")).toHaveLength(4);
    expect(screen.getByText("Add a concrete example.")).toBeVisible();
    expect(screen.getByText("Explain hash maps.")).toBeVisible();
    expect(screen.getByText("Use buckets.")).toBeVisible();
    expect(screen.getAllByText("Explains buckets clearly.")).toHaveLength(2);
    expect(screen.getAllByText("Add collision examples.")).toHaveLength(2);
    expect(
      screen.getByText("Compare chaining with open addressing."),
    ).toBeVisible();
    expect(
      screen.getByText(/AI feedback supports interview practice/),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "View dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("recovers when result loading is retried", async () => {
    getInterview
      .mockRejectedValueOnce(new Error("Interview not found."))
      .mockResolvedValueOnce(completedInterview());

    renderResultPage();

    expect(await screen.findByText("Interview not found.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Your practice baseline")).toBeVisible();
    await waitFor(() => expect(getInterview).toHaveBeenCalledTimes(2));
  });

  it("rejects malformed completed result data safely", async () => {
    const malformedResult = completedInterview();
    delete malformedResult.interview.questions[0].answers[0].feedback.strengths;
    getInterview.mockResolvedValueOnce(malformedResult);

    renderResultPage();

    expect(
      await screen.findByText("This interview is not ready to review yet."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  it.each([
    ["unsupported metadata", (result) => (result.interview.level = "expert")],
    [
      "invalid completion chronology",
      (result) => (result.interview.completedAt = "2026-09-16T23:40:00.000Z"),
    ],
    [
      "out-of-range nested score",
      (result) =>
        (result.interview.questions[0].answers[0].feedback.overallScore = 101),
    ],
    [
      "oversized nested list item",
      (result) => (result.interview.summary.strengths = ["s".repeat(501)]),
    ],
    [
      "invalid question order",
      (result) => (result.interview.questions[0].order = 2),
    ],
  ])("rejects %s", async (_label, mutate) => {
    const malformedResult = completedInterview();
    mutate(malformedResult);
    getInterview.mockResolvedValueOnce(malformedResult);

    renderResultPage();

    expect(
      await screen.findByText("This interview is not ready to review yet."),
    ).toBeVisible();
    expect(
      screen.queryByText("Your practice baseline"),
    ).not.toBeInTheDocument();
  });

  it("recovers from malformed completed data on explicit retry", async () => {
    const malformedResult = completedInterview();
    malformedResult.interview.summary.improvements = [];
    getInterview
      .mockResolvedValueOnce(malformedResult)
      .mockResolvedValueOnce(completedInterview());

    renderResultPage();

    expect(
      await screen.findByText("This interview is not ready to review yet."),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Your practice baseline")).toBeVisible();
    expect(getInterview).toHaveBeenCalledTimes(2);
  });
});
