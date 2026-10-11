import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createApp } from "../../src/app.js";
import CandidateProject from "../../src/models/CandidateProject.js";
import Resume from "../../src/models/Resume.js";
import { createAiProviderService } from "../../src/services/aiProviderService.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

useMongoTestDatabase();

const draft = {
  architecture: ["React client with an Express API"],
  claims: [],
  decisions: [],
  name: "MockMateAI",
  responsibilities: ["Built and tested the interview workflow"],
  role: "Full-stack developer",
  summary: "An interview preparation application with structured feedback.",
  technologies: ["React", "Node.js"],
  tradeoffs: [],
};

function provider(overrides = {}) {
  return {
    analyzeJobTarget: vi.fn(),
    evaluateAnswer: vi.fn(),
    extractProjectDrafts: vi.fn().mockResolvedValue({ drafts: [draft] }),
    generateQuestion: vi.fn(),
    ...overrides,
  };
}

async function signup(app, email = "project.owner@example.com") {
  const response = await request(app)
    .post("/api/auth/signup")
    .send({ email, name: "Project Owner", password: "secure-password-123" });
  return {
    cookie: response.headers["set-cookie"][0].split(";")[0],
    user: response.body.user,
  };
}

async function completedResume(
  userId,
  text = "Built MockMateAI using React and Node.js with an Express API.",
) {
  return Resume.create({
    extractedText: text,
    extractionStatus: "completed",
    mimeType: "application/pdf",
    originalName: "resume.pdf",
    sizeBytes: 1024,
    userId,
  });
}

describe("Project routes", () => {
  it("imports an unconfirmed README draft and removes temporary input", async () => {
    const readmeImportUploadDir = await mkdtemp(
      join(tmpdir(), "mockmateai-readme-"),
    );
    const app = createApp({ readmeImportUploadDir });
    const { cookie } = await signup(app);
    try {
      const response = await request(app)
        .post("/api/projects/readme-draft")
        .set("Cookie", cookie)
        .attach(
          "readme",
          Buffer.from(
            "# MockMateAI\n\n## Summary\nStructured interview preparation platform.\n\n## Role\nDeveloper\n\n## Technologies\n- React\n\n## Architecture\n- Client and API layers\n\n## Responsibilities\n- Built project workflows",
          ),
          { contentType: "text/markdown", filename: "README.md" },
        );
      expect(response.status).toBe(200);
      expect(response.body.draft).toMatchObject({
        name: "MockMateAI",
        source: "readme_import",
        technologies: ["React"],
      });
      expect(response.body).not.toHaveProperty("file");
      await expect(readdir(readmeImportUploadDir)).resolves.toEqual([]);
    } finally {
      await rm(readmeImportUploadDir, { force: true, recursive: true });
    }
  });

  it("rejects unsafe README uploads without retaining temporary input", async () => {
    const readmeImportUploadDir = await mkdtemp(
      join(tmpdir(), "mockmateai-readme-"),
    );
    const app = createApp({
      maxReadmeImportSizeBytes: 10,
      readmeImportUploadDir,
    });
    const { cookie } = await signup(app, "readme-safety@example.com");
    try {
      const unauthenticated = await request(app).post(
        "/api/projects/readme-draft",
      );
      const missing = await request(app)
        .post("/api/projects/readme-draft")
        .set("Cookie", cookie);
      const empty = await request(app)
        .post("/api/projects/readme-draft")
        .set("Cookie", cookie)
        .attach("readme", Buffer.alloc(0), {
          contentType: "text/markdown",
          filename: "README.md",
        });
      const multiple = await request(app)
        .post("/api/projects/readme-draft")
        .set("Cookie", cookie)
        .attach("readme", Buffer.from("# one"), {
          contentType: "text/markdown",
          filename: "README.md",
        })
        .attach("readme", Buffer.from("# two"), {
          contentType: "text/markdown",
          filename: "README.md",
        });
      const unexpected = await request(app)
        .post("/api/projects/readme-draft")
        .set("Cookie", cookie)
        .attach("other", Buffer.from("# one"), {
          contentType: "text/markdown",
          filename: "README.md",
        });
      const wrongType = await request(app)
        .post("/api/projects/readme-draft")
        .set("Cookie", cookie)
        .attach("readme", Buffer.from("# one"), {
          contentType: "application/pdf",
          filename: "README.md",
        });
      const binary = await request(app)
        .post("/api/projects/readme-draft")
        .set("Cookie", cookie)
        .attach("readme", Buffer.from([0, 1]), {
          contentType: "text/markdown",
          filename: "README.md",
        });
      const invalidUtf8 = await request(app)
        .post("/api/projects/readme-draft")
        .set("Cookie", cookie)
        .attach("readme", Buffer.from([0xc3, 0x28]), {
          contentType: "text/markdown",
          filename: "README.md",
        });
      const oversized = await request(app)
        .post("/api/projects/readme-draft")
        .set("Cookie", cookie)
        .attach("readme", Buffer.from("# longer than ten bytes"), {
          contentType: "text/markdown",
          filename: "README.md",
        });

      expect(unauthenticated.status).toBe(401);
      for (const response of [
        missing,
        empty,
        multiple,
        unexpected,
        wrongType,
        binary,
        invalidUtf8,
        oversized,
      ]) {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(JSON.stringify(response.body)).not.toContain("README.md");
      }
      await expect(readdir(readmeImportUploadDir)).resolves.toEqual([]);
    } finally {
      await rm(readmeImportUploadDir, { force: true, recursive: true });
    }
  });

  it("rate limits README imports", async () => {
    const readmeImportUploadDir = await mkdtemp(
      join(tmpdir(), "mockmateai-readme-"),
    );
    const app = createApp({
      readmeImportUploadDir,
      uploadsPerIpPerHour: 1,
      uploadsPerUserPerHour: 1,
    });
    const { cookie } = await signup(app, "readme-rate@example.com");
    try {
      const first = await request(app)
        .post("/api/projects/readme-draft")
        .set("Cookie", cookie)
        .attach("readme", Buffer.from("# MockMateAI"), {
          contentType: "text/markdown",
          filename: "README.md",
        });
      const second = await request(app)
        .post("/api/projects/readme-draft")
        .set("Cookie", cookie)
        .attach("readme", Buffer.from("# MockMateAI"), {
          contentType: "text/markdown",
          filename: "README.md",
        });
      expect(first.status).toBe(200);
      expect(second.status).toBe(429);
      await expect(readdir(readmeImportUploadDir)).resolves.toEqual([]);
    } finally {
      await rm(readmeImportUploadDir, { force: true, recursive: true });
    }
  });

  it("extracts unsaved owned suggestions and replays without another provider call", async () => {
    const aiProviderService = provider();
    const app = createApp({ aiProviderService });
    const { cookie, user } = await signup(app);
    const resume = await completedResume(user.id);
    const body = {
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      resumeId: resume.id,
    };
    const first = await request(app)
      .post("/api/projects/extract")
      .set("Cookie", cookie)
      .send(body);
    const replay = await request(app)
      .post("/api/projects/extract")
      .set("Cookie", cookie)
      .send(body);

    expect(first.status).toBe(200);
    expect(first.body.drafts[0]).toMatchObject({
      ...draft,
      source: "resume_suggestion",
      sourceResumeId: resume.id,
    });
    expect(replay.body).toEqual(first.body);
    expect(aiProviderService.extractProjectDrafts).toHaveBeenCalledTimes(1);
    expect(await CandidateProject.countDocuments()).toBe(0);
  });

  it("keeps provider rejection safe and transient for project suggestions", async () => {
    const generateContent = vi.fn().mockRejectedValue({
      message: "private upstream schema detail",
      status: 400,
    });
    const app = createApp({
      aiProviderService: createAiProviderService({
        aiProvider: "gemini",
        generateContent,
      }),
    });
    const { cookie, user } = await signup(app);
    const resume = await completedResume(user.id);

    const response = await request(app)
      .post("/api/projects/extract")
      .set("Cookie", cookie)
      .send({
        idempotencyKey: "15111111-1111-4111-8111-111111111111",
        resumeId: resume.id,
      });

    expect(response.status).toBe(502);
    expect(response.body.error).toEqual({
      code: "AI_PROVIDER_UNAVAILABLE",
      message: "AI practice is temporarily unavailable. Please try again.",
    });
    expect(JSON.stringify(response.body)).not.toContain("upstream");
    expect(generateContent).toHaveBeenCalledOnce();
    expect(await CandidateProject.countDocuments()).toBe(0);
  });

  it("denies foreign, failed, and changed-key resume input before provider work", async () => {
    const aiProviderService = provider();
    const app = createApp({ aiProviderService });
    const owner = await signup(app);
    const other = await signup(app, "project.other@example.com");
    const resume = await completedResume(owner.user.id);
    const key = "22222222-2222-4222-8222-222222222222";
    const foreign = await request(app)
      .post("/api/projects/extract")
      .set("Cookie", other.cookie)
      .send({ idempotencyKey: key, resumeId: resume.id });
    const failedResume = await Resume.create({
      extractionError: "Resume text could not be extracted.",
      extractionStatus: "failed",
      mimeType: "application/pdf",
      originalName: "failed.pdf",
      sizeBytes: 100,
      userId: other.user.id,
    });
    const failed = await request(app)
      .post("/api/projects/extract")
      .set("Cookie", other.cookie)
      .send({ idempotencyKey: key, resumeId: failedResume.id });

    expect(foreign.status).toBe(422);
    expect(failed.status).toBe(422);
    expect(aiProviderService.extractProjectDrafts).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation and supports owned CRUD", async () => {
    const app = createApp({ aiProviderService: provider() });
    const { cookie, user } = await signup(app);
    const resume = await completedResume(user.id);
    const denied = await request(app)
      .post("/api/projects")
      .set("Cookie", cookie)
      .send({ ...draft, confirmed: false });
    const created = await request(app)
      .post("/api/projects")
      .set("Cookie", cookie)
      .send({ ...draft, confirmed: true, sourceResumeId: resume.id });
    const updated = await request(app)
      .patch(`/api/projects/${created.body.project.id}`)
      .set("Cookie", cookie)
      .send({ ...draft, confirmed: true, name: "MockMateAI V2" });
    const listed = await request(app)
      .get("/api/projects")
      .set("Cookie", cookie);
    const deleted = await request(app)
      .delete(`/api/projects/${created.body.project.id}`)
      .set("Cookie", cookie);

    expect(denied.status).toBe(400);
    expect(denied.body.error.code).toBe("PROJECT_CONFIRMATION_REQUIRED");
    expect(created.status).toBe(201);
    expect(updated.body.project.name).toBe("MockMateAI V2");
    expect(updated.body.project).not.toHaveProperty("sourceResumeId");
    expect(listed.body.items).toHaveLength(1);
    expect(deleted.status).toBe(204);
  });

  it("hides foreign projects across read, update, and delete", async () => {
    const app = createApp({ aiProviderService: provider() });
    const owner = await signup(app);
    const other = await signup(app, "project.other2@example.com");
    const created = await request(app)
      .post("/api/projects")
      .set("Cookie", owner.cookie)
      .send({ ...draft, confirmed: true });
    const id = created.body.project.id;
    const responses = await Promise.all([
      request(app).get(`/api/projects/${id}`).set("Cookie", other.cookie),
      request(app)
        .patch(`/api/projects/${id}`)
        .set("Cookie", other.cookie)
        .send({ ...draft, confirmed: true }),
      request(app).delete(`/api/projects/${id}`).set("Cookie", other.cookie),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("PROJECT_NOT_FOUND");
    }
  });

  it("returns at most 50 newest owned projects", async () => {
    const app = createApp({ aiProviderService: provider() });
    const { cookie, user } = await signup(app);
    await CandidateProject.insertMany(
      Array.from({ length: 51 }, (_, index) => ({
        ...draft,
        confirmedAt: new Date(2026, 0, index + 1),
        name: `Project ${index}`,
        userId: user.id,
      })),
    );
    const listed = await request(app)
      .get("/api/projects")
      .set("Cookie", cookie);
    expect(listed.status).toBe(200);
    expect(listed.body.items).toHaveLength(50);
  });

  it("returns a safe error when persistence fails", async () => {
    const app = createApp({ aiProviderService: provider() });
    const { cookie } = await signup(app);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const createSpy = vi
      .spyOn(CandidateProject, "create")
      .mockRejectedValue(new Error("private database details"));
    const failed = await request(app)
      .post("/api/projects")
      .set("Cookie", cookie)
      .send({ ...draft, confirmed: true });
    expect(failed.status).toBe(500);
    expect(failed.body.error).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again later.",
    });
    expect(JSON.stringify(failed.body)).not.toContain("database");
    createSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("applies AI limits only to extraction", async () => {
    const app = createApp({
      aiProviderService: provider(),
      aiRequestsPerUserPerHour: 1,
    });
    const { cookie, user } = await signup(app);
    const resume = await completedResume(user.id);
    const first = await request(app)
      .post("/api/projects/extract")
      .set("Cookie", cookie)
      .send({
        idempotencyKey: "33333333-3333-4333-8333-333333333333",
        resumeId: resume.id,
      });
    const created = await request(app)
      .post("/api/projects")
      .set("Cookie", cookie)
      .send({ ...draft, confirmed: true });
    const limited = await request(app)
      .post("/api/projects/extract")
      .set("Cookie", cookie)
      .send({
        idempotencyKey: "44444444-4444-4444-8444-444444444444",
        resumeId: resume.id,
      });
    expect(first.status).toBe(200);
    expect(created.status).toBe(201);
    expect(limited.status).toBe(429);
  });
});
