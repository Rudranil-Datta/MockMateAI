import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import InterviewSession from "../../src/models/InterviewSession.js";
import JobTarget from "../../src/models/JobTarget.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

useMongoTestDatabase();

const user = {
  email: "role.simulation@example.com",
  name: "Role Candidate",
  password: "secure-password-123",
};

function feedback(overrides = {}) {
  return {
    accuracyScore: 70,
    clarityScore: 72,
    confidenceScore: 68,
    improvements: ["Add one concrete trade-off."],
    nextStep: "Practise one concise trade-off.",
    overallScore: 70,
    strengths: ["Clear structure."],
    ...overrides,
  };
}

function adaptiveDecision(input) {
  const latest = input.previousQuestions.at(-1);
  const coverage = latest
    ? input.coveragePlan.find(({ topicKey }) => topicKey === latest.topicKey)
    : input.coveragePlan[0];
  if (!latest) {
    return {
      decisionType: "baseline",
      difficulty: input.level,
      parentQuestionOrder: null,
      prompt: `Opening question about ${coverage.label}.`,
      reasonCode: "opening",
      testedSkillKeys: coverage.skillKeys,
      topicKey: coverage.topicKey,
    };
  }
  return {
    decisionType: "clarify",
    difficulty: latest.difficulty,
    parentQuestionOrder: latest.order,
    prompt: `Clarify your ${coverage.label} evidence with one trade-off.`,
    reasonCode: "partial_evidence",
    testedSkillKeys: coverage.skillKeys,
    topicKey: coverage.topicKey,
  };
}

function createRoleApp() {
  const aiProviderService = {
    evaluateAnswer: vi.fn().mockResolvedValue(feedback()),
    generateAdaptiveQuestion: vi
      .fn()
      .mockImplementation(async (input) => adaptiveDecision(input)),
    generateQuestion: vi.fn(),
  };
  return { aiProviderService, app: createApp({ aiProviderService }) };
}

async function signup(app, overrides = {}) {
  const response = await request(app)
    .post("/api/auth/signup")
    .send({ ...user, ...overrides });
  return {
    cookie: response.headers["set-cookie"][0].split(";")[0],
    userId: response.body.user.id,
  };
}

async function createTarget(userId, overrides = {}) {
  return JobTarget.create({
    analysis: {
      requirements: [
        {
          evidenceTerms: ["Node.js APIs"],
          key: "backend-apis",
          label: "Backend APIs",
          priority: "required",
        },
        {
          evidenceTerms: ["MongoDB"],
          key: "data-modeling",
          label: "Data modeling",
          priority: "preferred",
        },
      ],
      roleSummary: "Build secure and reliable backend services for customers.",
      skills: [
        {
          key: "mongodb",
          label: "MongoDB",
          sourceRequirementKeys: ["data-modeling"],
          weight: 3,
        },
        {
          key: "node-js",
          label: "Node.js",
          sourceRequirementKeys: ["backend-apis"],
          weight: 5,
        },
      ],
    },
    analysisRequestId: randomUUID(),
    company: "Example",
    description:
      "Build secure Node.js APIs with MongoDB and strong testing. ".repeat(3),
    status: "ready",
    title: "Backend Engineer",
    userId,
    ...overrides,
  });
}

function startRole(app, cookie, jobTargetId, idempotencyKey = randomUUID()) {
  return request(app).post("/api/interviews").set("Cookie", cookie).send({
    idempotencyKey,
    interviewType: "Role Simulation",
    jobTargetId,
    level: "intermediate",
  });
}

describe("Role Simulation interview routes", () => {
  it("starts from weighted target coverage and saves an immutable bounded snapshot", async () => {
    const { aiProviderService, app } = createRoleApp();
    const owner = await signup(app);
    const target = await createTarget(owner.userId);

    const response = await startRole(app, owner.cookie, target.id);

    expect(response.status).toBe(201);
    expect(response.body.question).toMatchObject({
      decisionType: "baseline",
      difficulty: "intermediate",
      order: 1,
      reasonCode: "opening",
      testedSkillKeys: ["node-js"],
      topicKey: "node-js",
    });
    expect(aiProviderService.generateAdaptiveQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        coveragePlan: [
          { label: "Node.js", skillKeys: ["node-js"], topicKey: "node-js" },
          { label: "MongoDB", skillKeys: ["mongodb"], topicKey: "mongodb" },
        ],
        interviewType: "Role Simulation",
        sessionPurpose: "standard",
      }),
    );
    const providerInput =
      aiProviderService.generateAdaptiveQuestion.mock.calls[0][0];
    expect(providerInput.contextSummary).not.toContain(target.description);

    const session = await InterviewSession.findById(response.body.interview.id);
    expect(session).toMatchObject({
      interviewType: "Role Simulation",
      sessionPurpose: "standard",
    });
    expect(session.jobTargetId.toString()).toBe(target.id);
    expect(session.contextSnapshot).toMatchObject({
      displayLabel: "Backend Engineer at Example",
      kind: "job_target",
    });
    expect(session.contextSnapshot.sourceId.toString()).toBe(target.id);
    expect(JSON.stringify(session.contextSnapshot)).not.toContain(
      target.description,
    );
    expect(
      Buffer.byteLength(JSON.stringify(session.contextSnapshot), "utf8"),
    ).toBeLessThanOrEqual(16 * 1024);

    const mobileTarget = await createTarget(owner.userId, {
      analysis: {
        requirements: [
          {
            evidenceTerms: ["Android"],
            key: "mobile-development",
            label: "Mobile development",
            priority: "required",
          },
        ],
        roleSummary: "Build dependable Android applications for customers.",
        skills: [
          {
            key: "android",
            label: "Android",
            sourceRequirementKeys: ["mobile-development"],
            weight: 5,
          },
        ],
      },
      analysisRequestId: randomUUID(),
      company: "Mobile Example",
      description:
        "Build dependable Android applications with robust automated testing. ".repeat(
          2,
        ),
      title: "Android Engineer",
    });
    const mobile = await startRole(app, owner.cookie, mobileTarget.id);

    expect(mobile.body.question).toMatchObject({
      testedSkillKeys: ["android"],
      topicKey: "android",
    });
  });

  it("rejects foreign and non-ready targets without provider work", async () => {
    const { aiProviderService, app } = createRoleApp();
    const owner = await signup(app);
    const other = await signup(app, {
      email: "other.role@example.com",
      name: "Other Candidate",
    });
    const foreignTarget = await createTarget(other.userId);
    const pendingTarget = await createTarget(owner.userId, {
      analysis: undefined,
      analysisClaimId: "claim-1",
      analysisStartedAt: new Date(),
      status: "analysis_pending",
    });

    const foreign = await startRole(app, owner.cookie, foreignTarget.id);
    const pending = await startRole(app, owner.cookie, pendingTarget.id);
    const missing = await request(app)
      .post("/api/interviews")
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "Role Simulation",
        level: "intermediate",
      });
    const prematureProjectDefense = await request(app)
      .post("/api/interviews")
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "Project Defense",
        level: "intermediate",
      });
    const targetOnV1 = await request(app)
      .post("/api/interviews")
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        jobTargetId: pendingTarget.id,
        level: "intermediate",
      });

    expect(foreign.status).toBe(404);
    expect(foreign.body.error.code).toBe("JOB_TARGET_NOT_FOUND");
    expect(pending.status).toBe(409);
    expect(pending.body.error.code).toBe("JOB_TARGET_NOT_READY");
    expect(missing.status).toBe(400);
    expect(missing.body.error.fields).toHaveProperty("jobTargetId");
    expect(prematureProjectDefense.status).toBe(400);
    expect(targetOnV1.status).toBe(400);
    expect(targetOnV1.body.error.fields).toHaveProperty("jobTargetId");
    expect(aiProviderService.generateAdaptiveQuestion).not.toHaveBeenCalled();
  });

  it("replays saved start after source deletion and conflicts on changed target", async () => {
    const { aiProviderService, app } = createRoleApp();
    const owner = await signup(app);
    const firstTarget = await createTarget(owner.userId);
    const secondTarget = await createTarget(owner.userId, {
      analysisRequestId: randomUUID(),
      company: "Second",
      title: "Platform Engineer",
    });
    const key = randomUUID();

    const first = await startRole(app, owner.cookie, firstTarget.id, key);
    await JobTarget.findByIdAndDelete(firstTarget.id);
    const replay = await startRole(app, owner.cookie, firstTarget.id, key);
    const conflict = await startRole(app, owner.cookie, secondTarget.id, key);

    expect(first.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(aiProviderService.generateAdaptiveQuestion).toHaveBeenCalledOnce();
  });

  it("derives next adaptive branch from saved feedback", async () => {
    const { aiProviderService, app } = createRoleApp();
    const owner = await signup(app);
    const target = await createTarget(owner.userId);
    const started = await startRole(app, owner.cookie, target.id);

    const answer = await request(app)
      .post(`/api/interviews/${started.body.interview.id}/answers`)
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        questionId: started.body.question.id,
        text: "I would validate input and explain one database trade-off.",
      });
    const next = await request(app)
      .post(`/api/interviews/${started.body.interview.id}/questions`)
      .set("Cookie", owner.cookie)
      .send({ idempotencyKey: randomUUID() });

    expect(answer.status).toBe(200);
    expect(next.status).toBe(200);
    expect(next.body.question).toMatchObject({
      decisionType: "clarify",
      order: 2,
      parentQuestionId: started.body.question.id,
      reasonCode: "partial_evidence",
      topicKey: "node-js",
    });
    expect(
      aiProviderService.generateAdaptiveQuestion.mock.calls[1][0]
        .previousQuestions[0].outcome,
    ).toBe("partial");
  });
});
