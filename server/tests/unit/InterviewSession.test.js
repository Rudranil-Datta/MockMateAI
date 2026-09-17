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
          status: "completed",
          summary: { overallScore: 80 },
        }),
      ).validate(),
    ).resolves.toBeUndefined();
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
      ]),
    );
  });
});
