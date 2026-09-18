import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PracticePage from "./PracticePage.jsx";

const startInterview = vi.hoisted(() => vi.fn());
const submitTextAnswer = vi.hoisted(() => vi.fn());
const completeInterview = vi.hoisted(() => vi.fn());
const generateNextQuestion = vi.hoisted(() => vi.fn());

vi.mock("../api/interviewApi.js", () => ({
  startInterview,
  submitTextAnswer,
  completeInterview,
  generateNextQuestion,
}));

function renderPracticePage() {
  return render(
    <MemoryRouter>
      <PracticePage />
    </MemoryRouter>,
  );
}

function interviewStartResult({
  interviewType = "DSA",
  level = "intermediate",
  order = 1,
  prompt = "Explain stacks.",
} = {}) {
  return {
    interview: {
      id: "session-123",
      interviewType,
      level,
      status: "active",
    },
    question: { id: "question-123", order, prompt },
  };
}

describe("PracticePage", () => {
  beforeEach(() => {
    startInterview.mockReset();
    submitTextAnswer.mockReset();
    completeInterview.mockReset();
    generateNextQuestion.mockReset();
  });

  it("requires interview type and level before submission", () => {
    renderPracticePage();

    expect(
      screen.getByRole("button", { name: "Start interview" }),
    ).toBeDisabled();
    expect(screen.getByText("Choose interview type")).toBeVisible();
    expect(screen.getByText("Choose your level")).toBeVisible();
  });

  it("shows saved first question returned by interview API", async () => {
    startInterview.mockResolvedValueOnce(interviewStartResult());
    renderPracticePage();

    fireEvent.click(screen.getByRole("button", { name: /DSA/i }));
    fireEvent.click(screen.getByLabelText(/Intermediate/i));
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

    await waitFor(() => {
      expect(startInterview).toHaveBeenCalledWith({
        interviewType: "DSA",
        level: "intermediate",
      });
    });
    expect(
      await screen.findByRole("heading", { name: "DSA practice" }),
    ).toBeVisible();
    expect(screen.getByText("Intermediate level")).toBeVisible();
    expect(screen.getByText("Question 1 of 5")).toBeVisible();
    expect(screen.getByText("Explain stacks.")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
  });

  it("preserves selections and retries after quota failure", async () => {
    startInterview
      .mockRejectedValueOnce({
        code: "AI_QUOTA_EXCEEDED",
        message: "AI practice is temporarily unavailable. Try again later.",
      })
      .mockResolvedValueOnce(
        interviewStartResult({
          interviewType: "System Design",
          level: "advanced",
          prompt: "Design a notification service.",
        }),
      );
    renderPracticePage();

    fireEvent.click(screen.getByRole("button", { name: /System Design/i }));
    fireEvent.click(screen.getByLabelText(/Advanced/i));
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

    expect(
      await screen.findByText(
        /AI practice is temporarily unavailable.*Press Start interview to retry\./,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /System Design/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/Advanced/i)).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

    expect(
      await screen.findByRole("heading", { name: "System Design practice" }),
    ).toBeVisible();
    expect(screen.getByText("Design a notification service.")).toBeVisible();
  });

  it("disables duplicate starts while question request is pending", async () => {
    let resolveStart;
    startInterview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStart = resolve;
        }),
    );
    renderPracticePage();

    fireEvent.click(screen.getByRole("button", { name: /HR/i }));
    fireEvent.click(screen.getByLabelText(/Beginner/i));
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

    expect(screen.getByRole("button", { name: "Working..." })).toBeDisabled();
    expect(screen.getByText("Preparing your first question...")).toBeVisible();
    expect(startInterview).toHaveBeenCalledTimes(1);

    resolveStart(
      interviewStartResult({
        interviewType: "HR",
        level: "beginner",
        prompt: "Tell me about yourself.",
      }),
    );

    expect(await screen.findByText("Tell me about yourself.")).toBeVisible();
  });

  it("keeps a typed answer and shows its character count", async () => {
    startInterview.mockResolvedValueOnce(interviewStartResult());
    renderPracticePage();

    fireEvent.click(screen.getByRole("button", { name: /DSA/i }));
    fireEvent.click(screen.getByLabelText(/Intermediate/i));
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

    const answer = await screen.findByLabelText("Your answer");
    fireEvent.change(answer, { target: { value: "Use a stack." } });

    expect(answer).toHaveValue("Use a stack.");
    expect(screen.getByText("12 characters")).toBeVisible();
  });

  it("requires a non-empty answer before feedback submission", async () => {
    startInterview.mockResolvedValueOnce(interviewStartResult());
    renderPracticePage();

    fireEvent.click(screen.getByRole("button", { name: /DSA/i }));
    fireEvent.click(screen.getByLabelText(/Intermediate/i));
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

    await screen.findByLabelText("Your answer");
    fireEvent.click(
      screen.getByRole("button", { name: "Submit for feedback" }),
    );

    expect(
      screen.getByText("Enter an answer before requesting feedback."),
    ).toBeVisible();
  });

  it("saves typed answer once and preserves draft while request is pending", async () => {
    let resolveAnswer;
    submitTextAnswer.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAnswer = resolve;
        }),
    );
    startInterview.mockResolvedValueOnce(interviewStartResult());
    renderPracticePage();

    fireEvent.click(screen.getByRole("button", { name: /DSA/i }));
    fireEvent.click(screen.getByLabelText(/Intermediate/i));
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

    const answer = await screen.findByLabelText("Your answer");
    fireEvent.change(answer, { target: { value: "Use a stack." } });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit for feedback" }),
    );

    expect(
      screen.getByRole("button", { name: "Saving answer..." }),
    ).toBeDisabled();
    expect(answer).toHaveValue("Use a stack.");
    expect(submitTextAnswer).toHaveBeenCalledWith({
      interviewId: "session-123",
      questionId: "question-123",
      text: "Use a stack.",
    });
    resolveAnswer({
      answer: {
        id: "answer-123",
        inputMode: "text",
        submittedAt: "2026-09-17T00:00:00.000Z",
        text: "Use a stack.",
      },
      feedback: {
        accuracyScore: 78,
        clarityScore: 76,
        confidenceScore: 74,
        improvements: ["Add an example."],
        nextStep: "Practise a concise example.",
        overallScore: 76,
        strengths: ["Explains the core idea."],
      },
    });
    expect(
      await screen.findByText("Your answer is saved. Feedback is ready."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Answer saved" })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Feedback" })).toBeVisible();
    expect(screen.getByText("Overall")).toBeVisible();
    expect(screen.getAllByText("76/100")).toHaveLength(2);
    expect(screen.getAllByText("Solid")).toHaveLength(4);
    expect(screen.getByText("Accuracy")).toBeVisible();
    expect(screen.getByText("Clarity")).toBeVisible();
    expect(screen.getByText("Confidence")).toBeVisible();
    expect(screen.getByText("Explains the core idea.")).toBeVisible();
    expect(screen.getByText("Add an example.")).toBeVisible();
    expect(screen.getByText("Practise a concise example.")).toBeVisible();
    expect(
      screen.getByText(/AI feedback supports interview practice/),
    ).toBeVisible();

    completeInterview.mockResolvedValueOnce({
      interview: {
        completedAt: "2026-09-17T00:00:00.000Z",
        id: "session-123",
        status: "completed",
        summary: { overallScore: 76 },
      },
    });
    expect(screen.getByRole("button", { name: "Next question" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "End session early" }));

    await waitFor(() => {
      expect(completeInterview).toHaveBeenCalledWith({
        interviewId: "session-123",
      });
    });
  });

  it("keeps draft and offers retry after answer save failure", async () => {
    startInterview.mockResolvedValueOnce(interviewStartResult());
    submitTextAnswer.mockRejectedValueOnce(
      new Error("Answer could not be saved."),
    );
    renderPracticePage();

    fireEvent.click(screen.getByRole("button", { name: /DSA/i }));
    fireEvent.click(screen.getByLabelText(/Intermediate/i));
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

    const answer = await screen.findByLabelText("Your answer");
    fireEvent.change(answer, { target: { value: "Use a stack." } });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit for feedback" }),
    );

    expect(
      await screen.findByText(
        /Answer could not be saved.*Your draft is still here/,
      ),
    ).toBeVisible();
    expect(answer).toHaveValue("Use a stack.");
    expect(
      screen.getByRole("button", { name: "Submit for feedback" }),
    ).toBeEnabled();
  });

  it("moves to saved next question after feedback", async () => {
    startInterview.mockResolvedValueOnce(interviewStartResult());
    submitTextAnswer.mockResolvedValueOnce({
      answer: {
        id: "answer-123",
        inputMode: "text",
        submittedAt: "2026-09-18T00:00:00.000Z",
        text: "Use a stack.",
      },
      feedback: {
        accuracyScore: 78,
        clarityScore: 76,
        confidenceScore: 74,
        improvements: ["Add an example."],
        nextStep: "Practise a concise example.",
        overallScore: 76,
        strengths: ["Explains the core idea."],
      },
    });
    generateNextQuestion.mockResolvedValueOnce({
      question: {
        id: "question-456",
        order: 2,
        prompt: "Explain queues.",
      },
    });
    renderPracticePage();

    fireEvent.click(screen.getByRole("button", { name: /DSA/i }));
    fireEvent.click(screen.getByLabelText(/Intermediate/i));
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));
    fireEvent.change(await screen.findByLabelText("Your answer"), {
      target: { value: "Use a stack." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit for feedback" }),
    );
    await screen.findByRole("button", { name: "Next question" });

    fireEvent.click(screen.getByRole("button", { name: "Next question" }));

    await waitFor(() => {
      expect(generateNextQuestion).toHaveBeenCalledWith({
        interviewId: "session-123",
      });
    });
    expect(await screen.findByText("Question 2 of 5")).toBeVisible();
    expect(screen.getByText("Explain queues.")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "2",
    );
  });

  it("prevents duplicate next-question requests while request is pending", async () => {
    let resolveNextQuestion;
    startInterview.mockResolvedValueOnce(interviewStartResult());
    submitTextAnswer.mockResolvedValueOnce({
      answer: {
        id: "answer-123",
        inputMode: "text",
        submittedAt: "2026-09-18T00:00:00.000Z",
        text: "Use a stack.",
      },
      feedback: {
        accuracyScore: 78,
        clarityScore: 76,
        confidenceScore: 74,
        improvements: ["Add an example."],
        nextStep: "Practise a concise example.",
        overallScore: 76,
        strengths: ["Explains the core idea."],
      },
    });
    generateNextQuestion.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNextQuestion = resolve;
        }),
    );
    renderPracticePage();

    fireEvent.click(screen.getByRole("button", { name: /DSA/i }));
    fireEvent.click(screen.getByLabelText(/Intermediate/i));
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));
    fireEvent.change(await screen.findByLabelText("Your answer"), {
      target: { value: "Use a stack." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit for feedback" }),
    );
    await screen.findByRole("button", { name: "Next question" });

    fireEvent.click(screen.getByRole("button", { name: "Next question" }));

    expect(
      screen.getByRole("button", { name: "Preparing next question..." }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "End session early" }),
    ).toBeDisabled();
    expect(generateNextQuestion).toHaveBeenCalledTimes(1);

    resolveNextQuestion({
      question: { id: "question-456", order: 2, prompt: "Explain queues." },
    });

    expect(await screen.findByText("Explain queues.")).toBeVisible();
  });

  it("preserves feedback and retries when next-question request fails", async () => {
    startInterview.mockResolvedValueOnce(interviewStartResult());
    submitTextAnswer.mockResolvedValueOnce({
      answer: {
        id: "answer-123",
        inputMode: "text",
        submittedAt: "2026-09-18T00:00:00.000Z",
        text: "Use a stack.",
      },
      feedback: {
        accuracyScore: 78,
        clarityScore: 76,
        confidenceScore: 74,
        improvements: ["Add an example."],
        nextStep: "Practise a concise example.",
        overallScore: 76,
        strengths: ["Explains the core idea."],
      },
    });
    generateNextQuestion.mockRejectedValueOnce(
      new Error("Question service is unavailable."),
    );
    renderPracticePage();

    fireEvent.click(screen.getByRole("button", { name: /DSA/i }));
    fireEvent.click(screen.getByLabelText(/Intermediate/i));
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));
    fireEvent.change(await screen.findByLabelText("Your answer"), {
      target: { value: "Use a stack." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit for feedback" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Next question" }),
    );

    expect(
      await screen.findByText(
        /Question service is unavailable.*Press Next question to retry\./,
      ),
    ).toBeVisible();
    expect(screen.getByText("Explains the core idea.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Next question" })).toBeEnabled();
  });

  it("offers completion instead of next question after fifth feedback", async () => {
    startInterview.mockResolvedValueOnce(
      interviewStartResult({ order: 5, prompt: "Summarize your approach." }),
    );
    submitTextAnswer.mockResolvedValueOnce({
      answer: {
        id: "answer-123",
        inputMode: "text",
        submittedAt: "2026-09-18T00:00:00.000Z",
        text: "I would summarize trade-offs.",
      },
      feedback: {
        accuracyScore: 78,
        clarityScore: 76,
        confidenceScore: 74,
        improvements: ["Add an example."],
        nextStep: "Practise a concise example.",
        overallScore: 76,
        strengths: ["Explains the core idea."],
      },
    });
    renderPracticePage();

    fireEvent.click(screen.getByRole("button", { name: /DSA/i }));
    fireEvent.click(screen.getByLabelText(/Intermediate/i));
    fireEvent.click(screen.getByRole("button", { name: "Start interview" }));
    fireEvent.change(await screen.findByLabelText("Your answer"), {
      target: { value: "I would summarize trade-offs." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit for feedback" }),
    );

    expect(
      await screen.findByRole("button", { name: "Complete session" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Next question" }),
    ).not.toBeInTheDocument();
  });
});
