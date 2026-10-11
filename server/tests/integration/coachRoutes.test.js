import { randomUUID } from "node:crypto";

import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import CandidateProject from "../../src/models/CandidateProject.js";
import JobTarget from "../../src/models/JobTarget.js";
import SkillEvidence from "../../src/models/SkillEvidence.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

useMongoTestDatabase();

async function signup(app, email) {
  const response = await request(app).post("/api/auth/signup").send({
    email,
    name: "Coach Candidate",
    password: "secure-password-123",
  });
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
          evidenceTerms: [],
          key: "backend",
          label: "Backend",
          priority: "required",
        },
      ],
      roleSummary:
        "Build reliable backend services with Node.js and clear trade-offs.",
      skills: [
        {
          key: "node-js",
          label: "Node.js",
          sourceRequirementKeys: ["backend"],
          weight: 5,
        },
        {
          key: "api-design",
          label: "API design",
          sourceRequirementKeys: ["backend"],
          weight: 3,
        },
      ],
    },
    analysisRequestId: randomUUID(),
    description:
      "Private target source text must never enter Coach output. ".repeat(3),
    status: "ready",
    title: "Backend Engineer",
    userId,
    ...overrides,
  });
}

async function addEvidence(userId, skillKey, skillLabel, outcome = "weak") {
  return SkillEvidence.create({
    answerId: new mongoose.Types.ObjectId(),
    difficulty: "intermediate",
    evidenceStrength: "direct",
    outcome,
    questionId: new mongoose.Types.ObjectId(),
    reasonCode: "answer_quality",
    sessionId: new mongoose.Types.ObjectId(),
    skillKey,
    skillLabel,
    userId,
  });
}

async function createProject(userId) {
  return CandidateProject.create({
    architecture: ["Private architecture detail"],
    claims: [],
    confirmedAt: new Date(),
    decisions: [],
    name: "MockMateAI",
    responsibilities: ["Private responsibility detail"],
    role: "Developer",
    summary: "Private project summary that must never enter Coach output.",
    technologies: ["React"],
    tradeoffs: [],
    userId,
  });
}

describe("Coach roadmap route", () => {
  it("returns owned deterministic safe Target roadmap without evidence writes", async () => {
    const app = createApp({ aiProviderService: {} });
    const owner = await signup(app, "coach-owner@example.com");
    const target = await createTarget(owner.userId);
    await addEvidence(owner.userId, "node-js", "Node.js");
    const bulkWrite = vi.spyOn(SkillEvidence, "bulkWrite");
    const updateOne = vi.spyOn(SkillEvidence, "updateOne");

    const response = await request(app)
      .get(`/api/coach/roadmap?context=target&targetId=${target.id}`)
      .set("Cookie", owner.cookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      context: { kind: "job_target", label: "Backend Engineer" },
      evidenceSyncStatus: "ready",
    });
    expect(response.body.actions).toHaveLength(3);
    expect(response.body.actions[0]).toMatchObject({
      to: `/practice?type=Role%20Simulation&targetId=${target.id}`,
      type: "collect_evidence",
    });
    expect(response.body.skills.map(({ skillKey }) => skillKey)).toEqual([
      "node-js",
      "api-design",
    ]);
    expect(response.body.skills.map((skill) => skill.ranking)).toEqual([
      { priority: 1, reason: "target_weight_then_evidence" },
      { priority: 2, reason: "target_weight_then_evidence" },
    ]);
    expect(JSON.stringify(response.body)).not.toContain(
      "Private target source text",
    );
    expect(bulkWrite).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("rejects malformed input and hides foreign or missing context identically", async () => {
    const app = createApp({ aiProviderService: {} });
    const owner = await signup(app, "coach-owner-two@example.com");
    const other = await signup(app, "coach-other@example.com");
    const foreign = await createTarget(other.userId);

    const unauthenticated = await request(app).get(
      "/api/coach/roadmap?context=overall",
    );
    const malformed = await request(app)
      .get(
        "/api/coach/roadmap?context=target&targetId=invalid&projectId=also-invalid",
      )
      .set("Cookie", owner.cookie);
    const foreignResponse = await request(app)
      .get(`/api/coach/roadmap?context=target&targetId=${foreign.id}`)
      .set("Cookie", owner.cookie);
    const missingResponse = await request(app)
      .get(
        `/api/coach/roadmap?context=target&targetId=${new mongoose.Types.ObjectId()}`,
      )
      .set("Cookie", owner.cookie);

    expect(unauthenticated.status).toBe(401);
    expect(malformed.status).toBe(400);
    expect(foreignResponse.status).toBe(404);
    expect(missingResponse.status).toBe(404);
    expect(foreignResponse.body.error).toEqual(missingResponse.body.error);
    expect(foreignResponse.body.error.code).toBe("COACH_CONTEXT_UNAVAILABLE");
  });

  it("returns confirmed Project coverage categories without project facts", async () => {
    const app = createApp({ aiProviderService: {} });
    const owner = await signup(app, "coach-project@example.com");
    const project = await createProject(owner.userId);

    const response = await request(app)
      .get(`/api/coach/roadmap?context=project&projectId=${project.id}`)
      .set("Cookie", owner.cookie);

    expect(response.status).toBe(200);
    expect(response.body.context).toEqual({
      kind: "candidate_project",
      label: "MockMateAI — Developer",
    });
    expect(response.body.skills.map(({ skillKey }) => skillKey)).toEqual([
      "architecture",
      "responsibilities",
      "technology-choices",
    ]);
    expect(response.body.skills.map((skill) => skill.ranking)).toEqual([
      { priority: 1, reason: "project_coverage_attention" },
      { priority: 2, reason: "project_coverage_attention" },
      { priority: 3, reason: "project_coverage_attention" },
    ]);
    expect(response.body.actions[0].to).toBe(
      "/practice?type=Project%20Defense",
    );
    expect(JSON.stringify(response.body)).not.toContain("Private project");
  });

  it("enforces Coach user limit before another read", async () => {
    const app = createApp({
      aiProviderService: {},
      coachRequestsPerUserPer15Minutes: 1,
    });
    const owner = await signup(app, "coach-limit@example.com");

    const first = await request(app)
      .get("/api/coach/roadmap?context=overall")
      .set("Cookie", owner.cookie);
    const blocked = await request(app)
      .get("/api/coach/roadmap?context=overall")
      .set("Cookie", owner.cookie);

    expect(first.status).toBe(200);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("COACH_RATE_LIMITED");
    expect(blocked.headers["retry-after"]).toBe("900");
  });

  it("enforces Coach IP limit across authenticated users", async () => {
    const app = createApp({
      aiProviderService: {},
      coachRequestsPerIpPer15Minutes: 1,
    });
    const firstUser = await signup(app, "coach-ip-one@example.com");
    const secondUser = await signup(app, "coach-ip-two@example.com");

    const first = await request(app)
      .get("/api/coach/roadmap?context=overall")
      .set("Cookie", firstUser.cookie);
    const blocked = await request(app)
      .get("/api/coach/roadmap?context=overall")
      .set("Cookie", secondUser.cookie);

    expect(first.status).toBe(200);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("COACH_RATE_LIMITED");
  });

  it("returns bounded owned Knowledge Tree without private source text", async () => {
    const app = createApp({ aiProviderService: {} });
    const owner = await signup(app, "coach-tree@example.com");
    const target = await createTarget(owner.userId);
    await addEvidence(owner.userId, "node-js", "Node.js");
    const bulkWrite = vi.spyOn(SkillEvidence, "bulkWrite");
    const updateOne = vi.spyOn(SkillEvidence, "updateOne");

    const response = await request(app)
      .get(`/api/coach/tree?context=target&targetId=${target.id}`)
      .set("Cookie", owner.cookie);

    expect(response.status).toBe(200);
    expect(response.body.nodes.length).toBeLessThanOrEqual(25);
    expect(response.body.edges.length).toBeLessThanOrEqual(24);
    expect(response.body.nodes.some((node) => node.label === "Backend")).toBe(
      true,
    );
    expect(response.body.nodes.some((node) => node.label === "Node.js")).toBe(
      true,
    );
    expect(JSON.stringify(response.body)).not.toContain(
      "Private target source text",
    );
    expect(bulkWrite).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("keeps tree validation and owned context errors safe across contexts", async () => {
    const app = createApp({ aiProviderService: {} });
    const owner = await signup(app, "coach-tree-owner@example.com");
    const other = await signup(app, "coach-tree-other@example.com");
    const foreign = await createTarget(other.userId);
    const project = await createProject(owner.userId);

    const overall = await request(app)
      .get("/api/coach/tree?context=overall")
      .set("Cookie", owner.cookie);
    const projectTree = await request(app)
      .get(`/api/coach/tree?context=project&projectId=${project.id}`)
      .set("Cookie", owner.cookie);
    const unauthenticated = await request(app).get(
      "/api/coach/tree?context=overall",
    );
    const malformed = await request(app)
      .get(
        "/api/coach/tree?context=target&targetId=invalid&projectId=also-invalid",
      )
      .set("Cookie", owner.cookie);
    const foreignResponse = await request(app)
      .get(`/api/coach/tree?context=target&targetId=${foreign.id}`)
      .set("Cookie", owner.cookie);
    const missingResponse = await request(app)
      .get(
        `/api/coach/tree?context=target&targetId=${new mongoose.Types.ObjectId()}`,
      )
      .set("Cookie", owner.cookie);

    expect(overall.status).toBe(200);
    expect(projectTree.status).toBe(200);
    expect(projectTree.body.nodes.map((node) => node.label)).toEqual(
      expect.arrayContaining([
        "Architecture",
        "Responsibilities",
        "Technology choices",
      ]),
    );
    expect(unauthenticated.status).toBe(401);
    expect(malformed.status).toBe(400);
    expect(foreignResponse.status).toBe(404);
    expect(foreignResponse.body.error).toEqual(missingResponse.body.error);
  });
});
