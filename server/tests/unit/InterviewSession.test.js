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
  it("accepts complete V2 question metadata while preserving legacy sessions", async () => {
    const session = new InterviewSession(
      validSession({
        focusSkillKey: "hash-maps",
        questions: [
          {
            ...validQuestion(1),
            decisionType: "retest",
            difficulty: "intermediate",
            reasonCode: "targeted_retest",
            testedSkillKeys: ["hash-maps"],
            topicKey: "hash-maps",
          },
        ],
        sessionPurpose: "targeted_practice",
      }),
    );

    await expect(session.validate()).resolves.toBeUndefined();
    await expect(
      new InterviewSession(validSession()).validate(),
    ).resolves.toBeUndefined();
  });

  it("rejects partial metadata and accepts one complete staged decision", async () => {
    await expect(
      new InterviewSession(
        validSession({
          questions: [{ ...validQuestion(1), topicKey: "hash-maps" }],
        }),
      ).validate(),
    ).rejects.toThrow();

    await expect(
      new InterviewSession(
        validSession({
          questionGeneration: {
            claimId: "claim-123",
            decision: {
              decisionType: "switch_topic",
              difficulty: "intermediate",
              parentQuestionOrder: 1,
              prompt: "Compare chaining and open addressing.",
              reasonCode: "coverage_gap",
              testedSkillKeys: ["collision-handling"],
              topicKey: "collision-handling",
            },
            expectedQuestionCount: 1,
            idempotencyKey: "00000000-0000-4000-8000-000000000001",
            prompt: "Compare chaining and open addressing.",
            startedAt: new Date(),
          },
          questions: [
            {
              ...validQuestion(1),
              decisionType: "baseline",
              difficulty: "intermediate",
              reasonCode: "opening",
              testedSkillKeys: ["hash-maps"],
              topicKey: "hash-maps",
            },
          ],
          startedAt: new Date(),
          status: "active",
        }),
      ).validate(),
    ).resolves.toBeUndefined();
  });

  it.each(["DSA", "HR", "System Design"])(
    "validates %s session type",
    async (interviewType) => {
      const session = new InterviewSession(validSession({ interviewType }));

      await expect(session.validate()).resolves.toBeUndefined();
      expect(session.status).toBe("created");
      expect(session.questions).toEqual([]);
    },
  );

  it("accepts one bounded immutable Role Simulation target snapshot", async () => {
    const targetId = new mongoose.Types.ObjectId();
    const session = new InterviewSession(
      validSession({
        contextSnapshot: {
          analysis: {
            requirements: [
              {
                evidenceTerms: ["Node.js"],
                key: "backend-apis",
                label: "Backend APIs",
                priority: "required",
              },
            ],
            roleSummary: "Build reliable backend services for customers.",
            skills: [
              {
                key: "node-js",
                label: "Node.js",
                sourceRequirementKeys: ["backend-apis"],
                weight: 5,
              },
            ],
          },
          displayLabel: "Backend Engineer at Example",
          kind: "job_target",
          sourceId: targetId,
          sourceUpdatedAt: new Date(),
        },
        interviewType: "Role Simulation",
        jobTargetId: targetId,
        sessionPurpose: "standard",
      }),
    );

    await expect(session.validate()).resolves.toBeUndefined();
    session.contextSnapshot.sourceId = new mongoose.Types.ObjectId();
    await expect(session.validate()).rejects.toThrow();
  });

  it("accepts one bounded immutable Project Defense snapshot", async () => {
    const projectId = new mongoose.Types.ObjectId();
    const session = new InterviewSession(
      validSession({
        contextSnapshot: {
          displayLabel: "Payments Platform — Backend Engineer",
          facts: {
            architecture: ["Modular monolith with async payment webhooks."],
            claims: [
              { evidence: "Measured in load tests.", text: "Cut latency 20%." },
            ],
            decisions: ["Used idempotency keys for payment retries."],
            name: "Payments Platform",
            responsibilities: ["Owned payment API reliability."],
            role: "Backend Engineer",
            summary: "Built a reliable platform for customer payments.",
            technologies: ["Node.js", "MongoDB"],
            tradeoffs: ["Favored consistency over write throughput."],
          },
          kind: "candidate_project",
          sourceId: projectId,
          sourceUpdatedAt: new Date(),
        },
        interviewType: "Project Defense",
        projectId,
        sessionPurpose: "standard",
      }),
    );

    await expect(session.validate()).resolves.toBeUndefined();
    session.contextSnapshot.sourceId = new mongoose.Types.ObjectId();
    await expect(session.validate()).rejects.toThrow();
  });

  it("accepts complete Project Defense challenge metadata and rejects partial or foreign-type use", async () => {
    const projectId = new mongoose.Types.ObjectId();
    const snapshot = {
      displayLabel: "Payments Platform — Backend Engineer",
      facts: {
        architecture: ["Modular monolith with async payment webhooks."],
        claims: [],
        decisions: [],
        name: "Payments Platform",
        responsibilities: ["Owned payment API reliability."],
        role: "Backend Engineer",
        summary: "Built a reliable payments platform.",
        technologies: ["Node.js"],
        tradeoffs: [],
      },
      kind: "candidate_project",
      sourceId: projectId,
      sourceUpdatedAt: new Date(),
    };
    const firstQuestionId = new mongoose.Types.ObjectId();
    const questions = [
      {
        ...validQuestion(1),
        _id: firstQuestionId,
        decisionType: "baseline",
        difficulty: "intermediate",
        reasonCode: "opening",
        testedSkillKeys: ["architecture"],
        topicKey: "architecture",
      },
    ];
    questions.push({
      ...validQuestion(2),
      challengeAnchorKey: "architecture:0",
      challengeAxis: "security",
      decisionType: "deepen",
      difficulty: "advanced",
      parentQuestionId: firstQuestionId,
      reasonCode: "strong_evidence",
      testedSkillKeys: ["architecture"],
      topicKey: "architecture",
    });
    await expect(
      new InterviewSession(
        validSession({
          contextSnapshot: snapshot,
          interviewType: "Project Defense",
          projectId,
          questions,
          sessionPurpose: "standard",
        }),
      ).validate(),
    ).resolves.toBeUndefined();

    await expect(
      new InterviewSession(
        validSession({
          questions: [
            validQuestion(1),
            {
              ...validQuestion(2),
              challengeAxis: "security",
            },
          ],
        }),
      ).validate(),
    ).rejects.toThrow();

    await expect(
      new InterviewSession(
        validSession({
          questions,
          status: "active",
          startedAt: new Date(),
        }),
      ).validate(),
    ).rejects.toThrow();
  });

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
    const completedAt = new Date();

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
          completedAt,
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
          startedAt: completedAt,
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
