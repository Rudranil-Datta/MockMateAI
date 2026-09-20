import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import InterviewSession, {
  maxAnswersPerQuestion,
  maxQuestionsPerInterview,
} from "../../src/models/InterviewSession.js";

function validSession(overrides = {}) {
  return {
    interviewType: "DSA",
    level: "intermediate",
    userId: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

function validQuestion(order) {
  return {
    generatedAt: new Date(),
    order,
    prompt: `Question ${order}`,
  };
}

function validFeedback() {
  return {
    accuracyScore: 80,
    clarityScore: 80,
    confidenceScore: 80,
    evaluatedAt: new Date(),
    improvements: ["Add an example."],
    nextStep: "Practise one example.",
    overallScore: 80,
    strengths: ["Clear explanation."],
  };
}

function validSummary() {
  return {
    accuracyScore: 80,
    clarityScore: 80,
    confidenceScore: 80,
    improvements: ["Add an example."],
    overallScore: 80,
    recommendation: "Practise one example.",
    strengths: ["Clear explanation."],
  };
}

describe("InterviewSession", () => {
  it.each(["DSA", "HR", "System Design"])(
    "validates %s session type",
    async (interviewType) => {
      const session = new InterviewSession(validSession({ interviewType }));

      await expect(session.validate()).resolves.toBeUndefined();
      expect(session.status).toBe("created");
      expect(session.questions).toEqual([]);
    },
  );

  it("rejects unsupported types, levels, and missing owners", async () => {
    await expect(
      new InterviewSession(
        validSession({ interviewType: "Technical" }),
      ).validate(),
    ).rejects.toThrow();
    await expect(
      new InterviewSession(validSession({ level: "expert" })).validate(),
    ).rejects.toThrow();
    await expect(
      new InterviewSession(validSession({ userId: undefined })).validate(),
    ).rejects.toThrow();
  });

  it("enforces question and answer caps", async () => {
    await expect(
      new InterviewSession(
        validSession({
          questions: Array.from(
            { length: maxQuestionsPerInterview + 1 },
            (_, index) => validQuestion(index + 1),
          ),
        }),
      ).validate(),
    ).rejects.toThrow();

    await expect(
      new InterviewSession(
        validSession({
          questions: [
            {
              ...validQuestion(1),
              answers: Array.from(
                { length: maxAnswersPerQuestion + 1 },
                () => ({
                  inputMode: "text",
                  submittedAt: new Date(),
                  text: "Answer",
                }),
              ),
            },
          ],
        }),
      ).validate(),
    ).rejects.toThrow();
  });

  it("rejects out-of-range feedback scores", async () => {
    await expect(
      new InterviewSession(
        validSession({
          questions: [
            {
              ...validQuestion(1),
              answers: [
                {
                  feedback: { overallScore: 101 },
                  inputMode: "text",
                  submittedAt: new Date(),
                  text: "Answer",
                },
              ],
            },
          ],
        }),
      ).validate(),
    ).rejects.toThrow();
  });

  it("requires completion data only for completed sessions", async () => {
    await expect(
      new InterviewSession(validSession({ status: "completed" })).validate(),
    ).rejects.toThrow();
    await expect(
      new InterviewSession(
        validSession({ completedAt: new Date(), status: "active" }),
      ).validate(),
    ).rejects.toThrow();

    await expect(
      new InterviewSession(
        validSession({
          completedAt: new Date(),
          questions: [
            {
              ...validQuestion(1),
              answers: [
                {
                  evaluationStatus: "completed",
                  feedback: validFeedback(),
                  inputMode: "text",
                  submittedAt: new Date(),
                  text: "Answer",
                },
              ],
            },
          ],
          startedAt: new Date(),
          status: "completed",
          summary: validSummary(),
        }),
      ).validate(),
    ).resolves.toBeUndefined();
  });

  it("rejects incomplete evaluation and summary state", async () => {
    await expect(
      new InterviewSession(
        validSession({
          completedAt: new Date(),
          questions: [
            {
              ...validQuestion(1),
              answers: [
                {
                  evaluationStatus: "completed",
                  inputMode: "text",
                  submittedAt: new Date(),
                  text: "Answer",
                },
              ],
            },
          ],
          startedAt: new Date(),
          status: "completed",
          summary: {},
        }),
      ).validate(),
    ).rejects.toThrow();

    await expect(
      new InterviewSession(
        validSession({
          questions: [
            {
              ...validQuestion(1),
              answers: [
                {
                  evaluationStatus: "pending",
                  inputMode: "text",
                  submittedAt: new Date(),
                  text: "Answer",
                },
              ],
            },
          ],
          startedAt: new Date(),
          status: "active",
        }),
      ).validate(),
    ).rejects.toThrow();
  });

  it("enforces recoverable evaluation claim and staged-output invariants", async () => {
    const pendingAnswer = {
      evaluationClaimId: "claim-123",
      evaluationKey: "00000000-0000-4000-8000-000000000001",
      evaluationStartedAt: new Date(),
      evaluationStatus: "pending",
      inputMode: "text",
      submittedAt: new Date(),
      text: "Answer",
    };

    await expect(
      new InterviewSession(
        validSession({
          questions: [
            {
              ...validQuestion(1),
              answers: [{ ...pendingAnswer, evaluationClaimId: undefined }],
            },
          ],
          startedAt: new Date(),
          status: "active",
        }),
      ).validate(),
    ).rejects.toThrow();

    await expect(
      new InterviewSession(
        validSession({
          questions: [
            {
              ...validQuestion(1),
              answers: [
                {
                  ...pendingAnswer,
                  evaluationOutput: validFeedback(),
                  evaluationStatus: "not_started",
                  evaluationClaimId: undefined,
                  evaluationStartedAt: undefined,
                },
              ],
            },
          ],
          startedAt: new Date(),
          status: "active",
        }),
      ).validate(),
    ).resolves.toBeUndefined();

    await expect(
      new InterviewSession(
        validSession({
          questions: [
            {
              ...validQuestion(1),
              answers: [
                {
                  evaluationOutput: validFeedback(),
                  evaluationStatus: "completed",
                  feedback: validFeedback(),
                  inputMode: "text",
                  submittedAt: new Date(),
                  text: "Answer",
                },
              ],
            },
          ],
          startedAt: new Date(),
          status: "active",
        }),
      ).validate(),
    ).rejects.toThrow();
  });

  it("rejects invalid completed-session timestamps and unfinished internal work", async () => {
    const startedAt = new Date("2026-09-20T10:00:00.000Z");
    const completedAt = new Date("2026-09-20T09:59:59.000Z");
    const completedAnswer = {
      evaluationStatus: "completed",
      feedback: validFeedback(),
      inputMode: "text",
      submittedAt: startedAt,
      text: "Answer",
    };

    await expect(
      new InterviewSession(
        validSession({
          completedAt,
          questions: [{ ...validQuestion(1), answers: [completedAnswer] }],
          startedAt,
          status: "completed",
          summary: validSummary(),
        }),
      ).validate(),
    ).rejects.toThrow();

    await expect(
      new InterviewSession(
        validSession({
          completedAt: new Date("2026-09-20T10:10:00.000Z"),
          questionGeneration: {
            claimId: "claim-123",
            expectedQuestionCount: 1,
            idempotencyKey: "00000000-0000-4000-8000-000000000001",
            startedAt,
          },
          questions: [{ ...validQuestion(1), answers: [completedAnswer] }],
          startedAt,
          status: "completed",
          summary: validSummary(),
        }),
      ).validate(),
    ).rejects.toThrow();

    await expect(
      new InterviewSession(
        validSession({
          completedAt: new Date("2026-09-20T10:10:00.000Z"),
          questions: [
            { ...validQuestion(1), answers: [completedAnswer] },
            {
              ...validQuestion(2),
              answers: [
                {
                  evaluationKey: "00000000-0000-4000-8000-000000000002",
                  evaluationOutput: validFeedback(),
                  evaluationStatus: "not_started",
                  inputMode: "text",
                  submittedAt: startedAt,
                  text: "Saved answer awaiting feedback persistence.",
                },
              ],
            },
          ],
          startedAt,
          status: "completed",
          summary: validSummary(),
        }),
      ).validate(),
    ).rejects.toThrow();
  });

  it("declares documented session indexes", () => {
    const indexSpecifications = InterviewSession.schema
      .indexes()
      .map(([specification]) => specification);

    expect(indexSpecifications).toEqual(
      expect.arrayContaining([
        { createdAt: -1, userId: 1 },
        { status: 1, updatedAt: -1, userId: 1 },
        { completedAt: -1, userId: 1 },
        { resumeId: 1 },
        { startRequestId: 1, userId: 1 },
      ]),
    );
  });
});
