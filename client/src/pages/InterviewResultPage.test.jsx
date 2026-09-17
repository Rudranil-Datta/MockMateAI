import { render, screen, waitFor } from "@testing-library/react";
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

describe("InterviewResultPage", () => {
  beforeEach(() => {
    getInterview.mockReset();
  });

  it("loads saved completed interview result", async () => {
    getInterview.mockResolvedValueOnce({
      interview: {
        completedAt: "2026-09-17T00:00:00.000Z",
        id: "session-123",
        interviewType: "DSA",
        level: "intermediate",
        questions: [
          {
            answers: [
              {
                feedback: { overallScore: 76 },
                id: "answer-123",
                text: "Use buckets.",
              },
            ],
            id: "question-123",
            order: 1,
            prompt: "Explain hash maps.",
          },
        ],
        status: "completed",
        summary: {
          accuracyScore: 78,
          clarityScore: 76,
          confidenceScore: 74,
          overallScore: 76,
          recommendation: "Add a concrete example.",
        },
      },
    });

    renderResultPage();

    expect(await screen.findByText("Your practice baseline")).toBeVisible();
    expect(getInterview).toHaveBeenCalledWith({
      interviewId: "session-123",
      signal: expect.any(AbortSignal),
    });
    expect(screen.getAllByText("76/100")).toHaveLength(2);
    expect(screen.getByText("Add a concrete example.")).toBeVisible();
    expect(screen.getByText("Explain hash maps.")).toBeVisible();
    expect(screen.getByText("Use buckets.")).toBeVisible();
  });

  it("keeps recovery available when result loading fails", async () => {
    getInterview.mockRejectedValueOnce(new Error("Interview not found."));

    renderResultPage();

    expect(await screen.findByText("Interview not found.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();

    await waitFor(() => expect(getInterview).toHaveBeenCalledTimes(1));
  });
});
