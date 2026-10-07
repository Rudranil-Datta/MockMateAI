import { randomUUID } from "node:crypto";

import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import CandidateProject from "../../src/models/CandidateProject.js";
import InterviewSession from "../../src/models/InterviewSession.js";
import JobTarget from "../../src/models/JobTarget.js";
import Resume from "../../src/models/Resume.js";
import SkillEvidence from "../../src/models/SkillEvidence.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

useMongoTestDatabase();

async function signup(app, email) {
  const response = await request(app).post("/api/auth/signup").send({
    email,
    name: "Planner Candidate",
    password: "secure-password-123",
  });
  return { cookie: response.headers["set-cookie"][0].split(";")[0], userId: response.body.user.id };
}

async function createTarget(userId) {
  return JobTarget.create({
    analysis: {
      requirements: [{ evidenceTerms: [], key: "backend", label: "Backend", priority: "required" }],
      roleSummary: "Build reliable backend services with clear trade-offs and ownership.",
      skills: [
        { key: "node-js", label: "Node.js", sourceRequirementKeys: ["backend"], weight: 5 },
        { key: "api-design", label: "API design", sourceRequirementKeys: ["backend"], weight: 3 },
      ],
    },
    analysisRequestId: randomUUID(),
    description: "Private target source text must not enter planner output. ".repeat(3),
    status: "ready",
    title: "Backend Engineer",
    userId,
  });
}

async function createProject(userId) {
  return CandidateProject.create({
    architecture: ["Private architecture fact"],
    claims: [],
    confirmedAt: new Date(),
    decisions: [],
    name: "MockMateAI",
    responsibilities: ["Private responsibility fact"],
    role: "Developer",
    summary: "Private project summary that must not enter planner output.",
    technologies: ["React"],
    tradeoffs: [],
    userId,
  });
}

async function addWeakEvidence(userId) {
  return SkillEvidence.create({
    answerId: new mongoose.Types.ObjectId(),
    difficulty: "intermediate",
    evidenceStrength: "direct",
    outcome: "weak",
    questionId: new mongoose.Types.ObjectId(),
    reasonCode: "answer_quality",
    sessionId: new mongoose.Types.ObjectId(),
    skillKey: "node-js",
    skillLabel: "Node.js",
    userId,
  });
}

async function createResume(userId) {
  return Resume.create({
    extractedText: "Private resume text must not enter planner output.",
    extractionStatus: "completed",
    mimeType: "application/pdf",
    originalName: "private-resume.pdf",
    sizeBytes: 100,
    userId,
  });
}

describe("interview plan route", () => {
  it("returns bounded generic preview without provider call or session write", async () => {
    const aiProviderService = { generateQuestion: vi.fn() };
    const app = createApp({ aiProviderService });
    const owner = await signup(app, "planner-generic@example.com");
    const resume = await createResume(owner.userId);

    const response = await request(app)
      .get(`/api/interviews/plan?interviewType=DSA&level=intermediate&resumeId=${resume.id}`)
      .set("Cookie", owner.cookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      adaptiveNotice: "Later questions adapt to your answers and are not prewritten.",
      context: null,
      openingFocus: { label: "Fundamentals" },
      selection: { interviewType: "DSA", level: "intermediate", sessionPurpose: "standard" },
    });
    expect(response.body.stages.length).toBeLessThanOrEqual(5);
    expect(JSON.stringify(response.body)).not.toContain("prompt");
    expect(JSON.stringify(response.body)).not.toContain("Private resume text");
    expect(aiProviderService.generateQuestion).not.toHaveBeenCalled();
    expect(await InterviewSession.countDocuments({ userId: owner.userId })).toBe(0);
  });

  it("uses owned Target, Project, and read-only targeted evidence without raw source text", async () => {
    const app = createApp({ aiProviderService: {} });
    const owner = await signup(app, "planner-owned@example.com");
    const target = await createTarget(owner.userId);
    const project = await createProject(owner.userId);
    await addWeakEvidence(owner.userId);
    const bulkWrite = vi.spyOn(SkillEvidence, "bulkWrite");
    const updateOne = vi.spyOn(SkillEvidence, "updateOne");

    const targetPlan = await request(app).get(`/api/interviews/plan?interviewType=Role%20Simulation&level=advanced&jobTargetId=${target.id}`).set("Cookie", owner.cookie);
    const projectPlan = await request(app).get(`/api/interviews/plan?interviewType=Project%20Defense&level=beginner&projectId=${project.id}`).set("Cookie", owner.cookie);
    const targetedPlan = await request(app).get("/api/interviews/plan?interviewType=DSA&level=intermediate&sessionPurpose=targeted_practice&focusSkillKey=node-js").set("Cookie", owner.cookie);

    expect(targetPlan.status).toBe(200);
    expect(targetPlan.body.context).toEqual({ kind: "job_target", label: "Backend Engineer" });
    expect(targetPlan.body.stages.map((stage) => stage.focus.label)).toEqual(["Node.js", "API design"]);
    expect(projectPlan.status).toBe(200);
    expect(projectPlan.body.stages.map((stage) => stage.focus.label)).toEqual(["Architecture", "Technology choices", "Responsibilities"]);
    expect(targetedPlan.status).toBe(200);
    expect(targetedPlan.body).toMatchObject({ selection: { focusSkillKey: "node-js", sessionPurpose: "targeted_practice" }, rationale: { kind: "targeted_evidence" } });
    expect(JSON.stringify(targetPlan.body)).not.toContain("Private target source text");
    expect(JSON.stringify(projectPlan.body)).not.toContain("Private architecture fact");
    expect(bulkWrite).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated, invalid, foreign, and missing plan selections safely", async () => {
    const app = createApp({ aiProviderService: {} });
    const owner = await signup(app, "planner-owner@example.com");
    const other = await signup(app, "planner-other@example.com");
    const foreign = await createTarget(other.userId);

    const unauthenticated = await request(app).get("/api/interviews/plan?interviewType=DSA&level=beginner");
    const malformed = await request(app).get("/api/interviews/plan?interviewType=Role%20Simulation&level=beginner&jobTargetId=invalid&projectId=also-invalid").set("Cookie", owner.cookie);
    const foreignResponse = await request(app).get(`/api/interviews/plan?interviewType=Role%20Simulation&level=beginner&jobTargetId=${foreign.id}`).set("Cookie", owner.cookie);
    const missingResponse = await request(app).get(`/api/interviews/plan?interviewType=Role%20Simulation&level=beginner&jobTargetId=${new mongoose.Types.ObjectId()}`).set("Cookie", owner.cookie);

    expect(unauthenticated.status).toBe(401);
    expect(malformed.status).toBe(400);
    expect(foreignResponse.status).toBe(404);
    expect(foreignResponse.body.error).toEqual(missingResponse.body.error);
  });
});
