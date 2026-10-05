import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import CandidateProject from "../../src/models/CandidateProject.js";
import InterviewSession from "../../src/models/InterviewSession.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

useMongoTestDatabase();

const user = {
  email: "project.defense@example.com",
  name: "Project Candidate",
  password: "secure-password-123",
};

function feedback() {
  return {
    accuracyScore: 70,
    clarityScore: 72,
    confidenceScore: 68,
    improvements: ["Add one concrete trade-off."],
    nextStep: "Practise one concise trade-off.",
    overallScore: 70,
    strengths: ["Clear structure."],
  };
}

function adaptiveDecision(input) {
  const latest = input.previousQuestions.at(-1);
  const coverage = latest
    ? input.coveragePlan.find(({ topicKey }) => topicKey === latest.topicKey)
    : input.coveragePlan[0];
  return latest
    ? {
        challengeAnchorKey: input.challengeDirective.anchorKey,
        challengeAxis: input.challengeDirective.axis,
        decisionType: "clarify",
        difficulty: latest.difficulty,
        parentQuestionOrder: latest.order,
        prompt: `Challenge "${input.challengeDirective.anchorText}": clarify your ${coverage.label} evidence.`,
        reasonCode: "partial_evidence",
        testedSkillKeys: coverage.skillKeys,
        topicKey: coverage.topicKey,
      }
    : {
        decisionType: "baseline",
        difficulty: input.level,
        parentQuestionOrder: null,
        prompt: `Defend your ${coverage.label}.`,
        reasonCode: "opening",
        testedSkillKeys: coverage.skillKeys,
        topicKey: coverage.topicKey,
      };
}

function createProjectApp() {
  const aiProviderService = {
    evaluateAnswer: vi.fn().mockResolvedValue(feedback()),
    evaluateV2Answer: vi.fn().mockImplementation(async ({ testedSkills }) => ({
      ...feedback(),
      skillEvidence: testedSkills.map(({ key }) => ({
        evidenceStrength: "direct",
        outcome: "partial",
        reasonCode: "answer_quality",
        skillKey: key,
      })),
    })),
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

async function createProject(userId, overrides = {}) {
  return CandidateProject.create({
    architecture: ["Modular monolith with asynchronous payment webhooks."],
    claims: [
      { evidence: "Measured in load tests.", text: "Reduced latency by 20%." },
    ],
    confirmedAt: new Date(),
    decisions: ["Used idempotency keys for payment retries."],
    name: "Payments Platform",
    responsibilities: ["Owned payment API reliability and release quality."],
    role: "Backend Engineer",
    summary: "Built a reliable platform for processing customer payments.",
    technologies: ["Node.js", "MongoDB"],
    tradeoffs: ["Favored consistency over maximum write throughput."],
    userId,
    ...overrides,
  });
}

function startDefense(app, cookie, projectId, idempotencyKey = randomUUID()) {
  return request(app).post("/api/interviews").set("Cookie", cookie).send({
    idempotencyKey,
    interviewType: "Project Defense",
    level: "intermediate",
    projectId,
  });
}

describe("Project Defense interview routes", () => {
  it("opens on architecture using confirmed facts-only coverage and snapshot", async () => {
    const { aiProviderService, app } = createProjectApp();
    const owner = await signup(app);
    const project = await createProject(owner.userId);

    const response = await startDefense(app, owner.cookie, project.id);

    expect(response.status).toBe(201);
    expect(response.body.question).toMatchObject({
      decisionType: "baseline",
      testedSkillKeys: ["architecture"],
      topicKey: "architecture",
    });
    expect(aiProviderService.generateAdaptiveQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        coveragePlan: [
          {
            label: "Architecture",
            skillKeys: ["architecture"],
            topicKey: "architecture",
          },
          {
            label: "Technology choices",
            skillKeys: ["technology-choices"],
            topicKey: "technology-choices",
          },
          {
            label: "Responsibilities",
            skillKeys: ["responsibilities"],
            topicKey: "responsibilities",
          },
          {
            label: "Decisions",
            skillKeys: ["decisions"],
            topicKey: "decisions",
          },
          {
            label: "Trade-offs",
            skillKeys: ["tradeoffs"],
            topicKey: "tradeoffs",
          },
          {
            label: "Claimed results",
            skillKeys: ["claimed-results"],
            topicKey: "claimed-results",
          },
        ],
        interviewType: "Project Defense",
        sessionPurpose: "standard",
      }),
    );
    const input = aiProviderService.generateAdaptiveQuestion.mock.calls[0][0];
    expect(input.contextSummary).not.toContain("sourceResumeId");
    expect(input.contextSummary).not.toContain("confirmedAt");

    const session = await InterviewSession.findById(response.body.interview.id);
    expect(session.projectId.toString()).toBe(project.id);
    expect(session.contextSnapshot).toMatchObject({
      displayLabel: "Payments Platform — Backend Engineer",
      kind: "candidate_project",
    });
    expect(session.contextSnapshot.sourceId.toString()).toBe(project.id);
    expect(JSON.stringify(session.contextSnapshot)).not.toContain(
      "sourceResumeId",
    );
    expect(
      Buffer.byteLength(JSON.stringify(session.contextSnapshot), "utf8"),
    ).toBeLessThanOrEqual(16 * 1024);
  });

  it("rejects foreign, missing, and unconfirmed projects before provider work", async () => {
    const { aiProviderService, app } = createProjectApp();
    const owner = await signup(app);
    const other = await signup(app, {
      email: "other.project@example.com",
      name: "Other Candidate",
    });
    const foreign = await createProject(other.userId);
    const unconfirmedId = new CandidateProject()._id;
    await CandidateProject.collection.insertOne({
      _id: unconfirmedId,
      architecture: ["Unconfirmed architecture."],
      claims: [],
      decisions: [],
      name: "Unconfirmed",
      responsibilities: ["Unconfirmed responsibility."],
      role: "Engineer",
      summary: "This record lacks explicit user confirmation.",
      technologies: ["Node.js"],
      tradeoffs: [],
      userId: new CandidateProject({ userId: owner.userId }).userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const foreignResponse = await startDefense(app, owner.cookie, foreign.id);
    const unconfirmed = await startDefense(
      app,
      owner.cookie,
      unconfirmedId.toString(),
    );
    const missingProject = await request(app)
      .post("/api/interviews")
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "Project Defense",
        level: "intermediate",
      });
    const projectOnV1 = await request(app)
      .post("/api/interviews")
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
        projectId: foreign.id,
      });
    const targetOnDefense = await request(app)
      .post("/api/interviews")
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "Project Defense",
        jobTargetId: foreign.id,
        level: "intermediate",
        projectId: foreign.id,
      });

    expect(foreignResponse.status).toBe(404);
    expect(foreignResponse.body.error.code).toBe("PROJECT_NOT_FOUND");
    expect(unconfirmed.status).toBe(409);
    expect(unconfirmed.body.error.code).toBe("PROJECT_NOT_READY");
    expect(missingProject.status).toBe(400);
    expect(missingProject.body.error.fields).toHaveProperty("projectId");
    expect(projectOnV1.status).toBe(400);
    expect(projectOnV1.body.error.fields).toHaveProperty("projectId");
    expect(targetOnDefense.status).toBe(400);
    expect(targetOnDefense.body.error.fields).toHaveProperty("jobTargetId");
    expect(aiProviderService.generateAdaptiveQuestion).not.toHaveBeenCalled();
  });

  it("replays after source deletion and conflicts on changed project", async () => {
    const { aiProviderService, app } = createProjectApp();
    const owner = await signup(app);
    const firstProject = await createProject(owner.userId);
    const secondProject = await createProject(owner.userId, {
      name: "Search Platform",
    });
    const key = randomUUID();

    const first = await startDefense(app, owner.cookie, firstProject.id, key);
    await CandidateProject.findByIdAndDelete(firstProject.id);
    const replay = await startDefense(app, owner.cookie, firstProject.id, key);
    const savedResult = await request(app)
      .get(`/api/interviews/${first.body.interview.id}`)
      .set("Cookie", owner.cookie);
    const conflict = await startDefense(
      app,
      owner.cookie,
      secondProject.id,
      key,
    );

    expect(first.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    expect(savedResult.body.interview.contextSnapshot).toEqual({
      kind: "candidate_project",
      label: "Payments Platform — Backend Engineer",
    });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(aiProviderService.generateAdaptiveQuestion).toHaveBeenCalledOnce();
  });

  it("uses saved feedback for a grounded Day 8 challenge", async () => {
    const { aiProviderService, app } = createProjectApp();
    const owner = await signup(app);
    const project = await createProject(owner.userId);
    const started = await startDefense(app, owner.cookie, project.id);

    await request(app)
      .post(`/api/interviews/${started.body.interview.id}/answers`)
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        questionId: started.body.question.id,
        text: "I chose a modular monolith and measured its trade-offs.",
      });
    const next = await request(app)
      .post(`/api/interviews/${started.body.interview.id}/questions`)
      .set("Cookie", owner.cookie)
      .send({ idempotencyKey: randomUUID() });

    expect(next.status).toBe(200);
    expect(next.body.question).toMatchObject({
      challengeAnchorKey: "architecture:0",
      challengeAxis: "architecture",
      decisionType: "clarify",
      order: 2,
      parentQuestionId: started.body.question.id,
      topicKey: "architecture",
    });
    expect(aiProviderService.generateAdaptiveQuestion.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        challengeDirective: {
          anchorKey: "architecture:0",
          anchorText: "Modular monolith with asynchronous payment webhooks.",
          axis: "architecture",
          latestAnswer:
            "I chose a modular monolith and measured its trade-offs.",
        },
      }),
    );
  });

  it("rejects an ungrounded challenge without partial state and retries safely", async () => {
    const { aiProviderService, app } = createProjectApp();
    const owner = await signup(app, { email: "challenge.retry@example.com" });
    const project = await createProject(owner.userId);
    const started = await startDefense(app, owner.cookie, project.id);
    await request(app)
      .post(`/api/interviews/${started.body.interview.id}/answers`)
      .set("Cookie", owner.cookie)
      .send({
        idempotencyKey: randomUUID(),
        questionId: started.body.question.id,
        text: "I chose module boundaries to isolate payment failures.",
      });
    aiProviderService.generateAdaptiveQuestion.mockImplementationOnce(
      async (input) => ({
        ...adaptiveDecision(input),
        prompt: "Give more architecture detail without naming the anchor.",
      }),
    );
    const key = randomUUID();

    const rejected = await request(app)
      .post(`/api/interviews/${started.body.interview.id}/questions`)
      .set("Cookie", owner.cookie)
      .send({ idempotencyKey: key });
    const unchanged = await InterviewSession.findById(
      started.body.interview.id,
    );
    const retried = await request(app)
      .post(`/api/interviews/${started.body.interview.id}/questions`)
      .set("Cookie", owner.cookie)
      .send({ idempotencyKey: key });

    expect(rejected.status).toBe(502);
    expect(rejected.body.error.code).toBe("INVALID_AI_RESPONSE");
    expect(unchanged.questions).toHaveLength(1);
    expect(unchanged.questionGeneration).toBeUndefined();
    expect(retried.status).toBe(200);
    expect(retried.body.question).toMatchObject({
      challengeAnchorKey: "architecture:0",
      challengeAxis: "architecture",
      parentQuestionId: started.body.question.id,
    });
  });
});
