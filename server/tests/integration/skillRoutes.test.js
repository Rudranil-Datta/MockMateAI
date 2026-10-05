import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import JobTarget from "../../src/models/JobTarget.js";
import SkillEvidence from "../../src/models/SkillEvidence.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

useMongoTestDatabase();

function feedback() {
  return {
    accuracyScore: 70,
    clarityScore: 72,
    confidenceScore: 68,
    improvements: ["Add a concrete trade-off."],
    nextStep: "Practise one concise trade-off.",
    overallScore: 70,
    strengths: ["Clear structure."],
  };
}

function createAppForSkills() {
  const aiProviderService = {
    evaluateAnswer: vi.fn(),
    evaluateV2Answer: vi.fn().mockImplementation(async ({ testedSkills }) => ({
      ...feedback(),
      skillEvidence: testedSkills.map(({ key }) => ({
        evidenceStrength: "direct",
        outcome: "partial",
        reasonCode: "answer_quality",
        skillKey: key,
      })),
    })),
    generateAdaptiveQuestion: vi.fn().mockImplementation(async (input) => ({
      decisionType:
        input.sessionPurpose === "targeted_practice" ? "retest" : "baseline",
      difficulty: input.level,
      parentQuestionOrder: null,
      prompt: "Explain how you would build a safe Node.js API.",
      reasonCode:
        input.sessionPurpose === "targeted_practice"
          ? "targeted_retest"
          : "opening",
      testedSkillKeys: ["node-js"],
      topicKey: "node-js",
    })),
    generateQuestion: vi.fn(),
  };
  return { aiProviderService, app: createApp({ aiProviderService }) };
}

async function signup(app, email) {
  const response = await request(app).post("/api/auth/signup").send({
    email,
    name: "Skill Candidate",
    password: "secure-password-123",
  });
  return {
    cookie: response.headers["set-cookie"][0].split(";")[0],
    userId: response.body.user.id,
  };
}

async function startRole(app, owner) {
  const target = await JobTarget.create({
    analysis: {
      requirements: [
        {
          evidenceTerms: [],
          key: "backend",
          label: "Backend",
          priority: "required",
        },
      ],
      roleSummary: "Build reliable backend systems with Node.js.",
      skills: [
        {
          key: "node-js",
          label: "Node.js",
          sourceRequirementKeys: ["backend"],
          weight: 5,
        },
      ],
    },
    analysisRequestId: randomUUID(),
    description:
      "Build reliable backend systems with Node.js and strong automated testing. ".repeat(
        2,
      ),
    status: "ready",
    title: "Backend Engineer",
    userId: owner.userId,
  });
  const started = await request(app)
    .post("/api/interviews")
    .set("Cookie", owner.cookie)
    .send({
      idempotencyKey: randomUUID(),
      interviewType: "Role Simulation",
      jobTargetId: target.id,
      level: "intermediate",
    });
  return started.body;
}

afterEach(() => vi.restoreAllMocks());

describe("skill profile routes", () => {
  it("persists immutable V2 evidence then returns owner-scoped profile", async () => {
    const { app } = createAppForSkills();
    const owner = await signup(app, "skills@example.com");
    const started = await startRole(app, owner);
    const answer = await request(app)
      .post(`/api/interviews/${started.interview.id}/answers`)
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        questionId: started.question.id,
        text: "I would validate input and isolate the database layer.",
      });

    expect(answer.status).toBe(200);
    await expect(
      SkillEvidence.countDocuments({ userId: owner.userId }),
    ).resolves.toBe(1);
    const profile = await request(app)
      .get("/api/skills/profile")
      .set("Cookie", owner.cookie);
    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject({
      evidenceSyncStatus: "ready",
      recommendedAction: { skillKey: "node-js", type: "targeted_practice" },
      skills: [
        { confidence: "provisional", evidenceCount: 1, skillKey: "node-js" },
      ],
    });
    expect(JSON.stringify(profile.body)).not.toContain("validate input");
  });

  it("keeps feedback completed, then recovers a failed evidence sync once", async () => {
    const { app } = createAppForSkills();
    const owner = await signup(app, "recovery@example.com");
    const started = await startRole(app, owner);
    const writeSpy = vi
      .spyOn(SkillEvidence, "bulkWrite")
      .mockRejectedValueOnce(new Error("database unavailable"));
    const answer = await request(app)
      .post(`/api/interviews/${started.interview.id}/answers`)
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        questionId: started.question.id,
        text: "I would validate input and isolate the database layer.",
      });

    expect(answer.status).toBe(200);
    await expect(SkillEvidence.countDocuments()).resolves.toBe(0);
    const profile = await request(app)
      .get("/api/skills/profile")
      .set("Cookie", owner.cookie);
    expect(profile.body.evidenceSyncStatus).toBe("ready");
    await expect(
      SkillEvidence.countDocuments({ userId: owner.userId }),
    ).resolves.toBe(1);
    expect(writeSpy).toHaveBeenCalledTimes(2);
  });

  it("never exposes another owner's profile", async () => {
    const { app } = createAppForSkills();
    const owner = await signup(app, "owner-skills@example.com");
    const other = await signup(app, "other-skills@example.com");
    const started = await startRole(app, owner);
    await request(app)
      .post(`/api/interviews/${started.interview.id}/answers`)
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        questionId: started.question.id,
        text: "I would validate input and isolate the database layer.",
      });

    const profile = await request(app)
      .get("/api/skills/profile")
      .set("Cookie", other.cookie);
    expect(profile.body).toEqual({
      evidenceSyncStatus: "ready",
      recommendedAction: null,
      skills: [],
    });
  });

  it("starts owned weak-skill targeted practice and adds retest evidence", async () => {
    const { app } = createAppForSkills();
    const owner = await signup(app, "targeted@example.com");
    const source = await startRole(app, owner);
    await request(app)
      .post(`/api/interviews/${source.interview.id}/answers`)
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        questionId: source.question.id,
        text: "I would validate input and isolate the database layer.",
      });
    const targetRequest = {
      focusSkillKey: "node-js",
      idempotencyKey: randomUUID(),
      interviewType: "DSA",
      level: "intermediate",
      sessionPurpose: "targeted_practice",
    };
    const targeted = await request(app)
      .post("/api/interviews")
      .set("Cookie", owner.cookie)
      .send(targetRequest);
    const replayed = await request(app)
      .post("/api/interviews")
      .set("Cookie", owner.cookie)
      .send(targetRequest);

    expect(targeted.status).toBe(201);
    expect(replayed.body.interview.id).toBe(targeted.body.interview.id);
    expect(replayed.body.question.id).toBe(targeted.body.question.id);
    expect(targeted.body).toMatchObject({
      interview: {
        focusSkillKey: "node-js",
        sessionPurpose: "targeted_practice",
      },
      question: {
        decisionType: "retest",
        reasonCode: "targeted_retest",
        testedSkillKeys: ["node-js"],
      },
    });
    await request(app)
      .post(`/api/interviews/${targeted.body.interview.id}/answers`)
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        questionId: targeted.body.question.id,
        text: "I would validate input and isolate the database layer.",
      });
    await request(app)
      .post(`/api/interviews/${targeted.body.interview.id}/complete`)
      .set("Cookie", owner.cookie);
    const replay = await request(app)
      .get(`/api/interviews/${targeted.body.interview.id}`)
      .set("Cookie", owner.cookie);
    await expect(
      SkillEvidence.countDocuments({ userId: owner.userId }),
    ).resolves.toBe(2);
    expect(replay.body.interview.retestComparison).toMatchObject({
      skillKey: "node-js",
    });
  });

  it("rejects targeted practice without owned weak evidence", async () => {
    const { app } = createAppForSkills();
    const owner = await signup(app, "targeted-reject@example.com");
    const response = await request(app)
      .post("/api/interviews")
      .set("Cookie", owner.cookie)
      .send({
        focusSkillKey: "invented-skill",
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
        sessionPurpose: "targeted_practice",
      });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("SKILL_NOT_FOUND");
  });

  it("rejects malformed focus requests and another owner's skill", async () => {
    const { app } = createAppForSkills();
    const owner = await signup(app, "targeted-owner@example.com");
    const other = await signup(app, "targeted-other@example.com");
    const source = await startRole(app, owner);
    await request(app)
      .post(`/api/interviews/${source.interview.id}/answers`)
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        questionId: source.question.id,
        text: "I would validate input and isolate the database layer.",
      });

    const missingFocus = await request(app)
      .post("/api/interviews")
      .set("Cookie", other.cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
        sessionPurpose: "targeted_practice",
      });
    const extraField = await request(app)
      .post("/api/interviews")
      .set("Cookie", other.cookie)
      .send({
        focusSkillKey: "node-js",
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
        masteryScore: 0,
        sessionPurpose: "targeted_practice",
      });
    const foreignSkill = await request(app)
      .post("/api/interviews")
      .set("Cookie", other.cookie)
      .send({
        focusSkillKey: "node-js",
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
        sessionPurpose: "targeted_practice",
      });

    expect(missingFocus.status).toBe(400);
    expect(extraField.status).toBe(400);
    expect(foreignSkill.status).toBe(404);
    expect(foreignSkill.body.error.code).toBe("SKILL_NOT_FOUND");
  });

  it("preserves targeted setup after provider failure and allows retry", async () => {
    const { aiProviderService, app } = createAppForSkills();
    const owner = await signup(app, "targeted-retry@example.com");
    const source = await startRole(app, owner);
    await request(app)
      .post(`/api/interviews/${source.interview.id}/answers`)
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        questionId: source.question.id,
        text: "I would validate input and isolate the database layer.",
      });
    aiProviderService.generateAdaptiveQuestion.mockRejectedValueOnce(
      Object.assign(new Error("provider unavailable"), {
        code: "AI_PROVIDER_UNAVAILABLE",
        status: 503,
      }),
    );
    const targetRequest = {
      focusSkillKey: "node-js",
      idempotencyKey: randomUUID(),
      interviewType: "DSA",
      level: "intermediate",
      sessionPurpose: "targeted_practice",
    };

    const failed = await request(app)
      .post("/api/interviews")
      .set("Cookie", owner.cookie)
      .send(targetRequest);
    const retried = await request(app)
      .post("/api/interviews")
      .set("Cookie", owner.cookie)
      .send(targetRequest);

    expect(failed.status).toBe(503);
    expect(failed.body.error.code).toBe("AI_PROVIDER_UNAVAILABLE");
    expect(retried.status).toBe(201);
    expect(retried.body).toMatchObject({
      interview: { sessionPurpose: "targeted_practice" },
      question: { decisionType: "retest", reasonCode: "targeted_retest" },
    });
  });
});
