import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import Resume from "../../src/models/Resume.js";
import { createResumeService } from "../../src/services/resumeService.js";
import { createTestPdf } from "../helpers/createTestPdf.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

const validSignup = {
  email: "resume.owner@example.com",
  name: "Resume Owner",
  password: "secure-password-123",
};
const validPdf = createTestPdf("Backend Engineer Node MongoDB");
const uploadDirectories = [];

useMongoTestDatabase();

afterEach(async () => {
  await Promise.all(
    uploadDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

function getSessionCookie(response) {
  return response.headers["set-cookie"][0].split(";")[0];
}

async function createUploadApp(options = {}) {
  const resumeUploadDir = await mkdtemp(join(tmpdir(), "mockmateai-resumes-"));
  uploadDirectories.push(resumeUploadDir);

  return {
    app: createApp({
      maxResumeSizeBytes: 1024,
      resumeUploadDir,
      ...options,
    }),
    resumeUploadDir,
  };
}

async function signup(app, credentials = validSignup) {
  const response = await request(app)
    .post("/api/auth/signup")
    .send(credentials);

  return { cookie: getSessionCookie(response), user: response.body.user };
}

describe("resume routes", () => {
  it("extracts an owned valid PDF without exposing storage or text", async () => {
    const { app, resumeUploadDir } = await createUploadApp();
    const { cookie, user } = await signup(app);

    const response = await request(app)
      .post("/api/resumes")
      .set("Cookie", cookie)
      .attach("resume", validPdf, {
        contentType: "application/pdf",
        filename: "Asha-Kumar-Resume.pdf",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      resume: {
        createdAt: expect.any(String),
        extractionStatus: "completed",
        id: expect.any(String),
        mimeType: "application/pdf",
        originalName: "Asha-Kumar-Resume.pdf",
        sizeBytes: validPdf.length,
      },
    });
    expect(response.body.resume).not.toHaveProperty("storage");
    expect(response.body.resume).not.toHaveProperty("extractedText");

    const resume = await Resume.findById(response.body.resume.id);
    expect(resume).toMatchObject({
      extractionStatus: "completed",
      extractedText: expect.stringContaining("Backend Engineer"),
      userId: expect.objectContaining({ toString: expect.any(Function) }),
    });
    expect(resume.userId.toString()).toBe(user.id);
    expect(resume.storage.key).toMatch(/^[a-f0-9-]+\.pdf$/);
    expect(await readdir(resumeUploadDir)).toEqual([resume.storage.key]);
  });

  it("requires authentication and rejects unsupported, invalid-signature, and oversized uploads", async () => {
    const { app, resumeUploadDir } = await createUploadApp({
      maxResumeSizeBytes: 8,
    });
    const { cookie } = await signup(app);

    const unauthenticatedResponse = await request(app)
      .post("/api/resumes")
      .attach("resume", validPdf, {
        contentType: "application/pdf",
        filename: "resume.pdf",
      });
    const unsupportedResponse = await request(app)
      .post("/api/resumes")
      .set("Cookie", cookie)
      .attach("resume", Buffer.from("plain text"), {
        contentType: "text/plain",
        filename: "resume.txt",
      });
    const malformedResponse = await request(app)
      .post("/api/resumes")
      .set("Cookie", cookie)
      .attach("resume", Buffer.from("nope"), {
        contentType: "application/pdf",
        filename: "resume.pdf",
      });
    const oversizedResponse = await request(app)
      .post("/api/resumes")
      .set("Cookie", cookie)
      .attach("resume", validPdf, {
        contentType: "application/pdf",
        filename: "resume.pdf",
      });

    expect(unauthenticatedResponse.status).toBe(401);
    expect(unsupportedResponse.status).toBe(415);
    expect(unsupportedResponse.body.error.code).toBe("UNSUPPORTED_RESUME_FILE");
    expect(malformedResponse.status).toBe(415);
    expect(malformedResponse.body.error.code).toBe("INVALID_RESUME_FILE");
    expect(oversizedResponse.status).toBe(413);
    expect(oversizedResponse.body.error.code).toBe("RESUME_TOO_LARGE");
    await expect(Resume.countDocuments()).resolves.toBe(0);
    expect(await readdir(resumeUploadDir)).toEqual([]);
  });

  it("persists safe recoverable failure metadata when PDF parsing fails", async () => {
    const { app, resumeUploadDir } = await createUploadApp();
    const { cookie } = await signup(app);

    const response = await request(app)
      .post("/api/resumes")
      .set("Cookie", cookie)
      .attach("resume", Buffer.from("%PDF-1.7\nnot a complete PDF"), {
        contentType: "application/pdf",
        filename: "broken.pdf",
      });

    expect(response.status).toBe(201);
    expect(response.body.resume.extractionStatus).toBe("failed");
    expect(response.body.resume).not.toHaveProperty("extractionError");
    expect(response.body.resume).not.toHaveProperty("extractedText");

    const resume = await Resume.findById(response.body.resume.id);
    expect(resume).toMatchObject({
      extractionError: "Resume text could not be extracted.",
      extractionStatus: "failed",
    });
    expect(resume.extractedText).toBeUndefined();
    expect(await readdir(resumeUploadDir)).toEqual([resume.storage.key]);
  });

  it("allows only the owner to transition a pending resume", async () => {
    const { app, resumeUploadDir } = await createUploadApp();
    const { user: owner } = await signup(app);
    const { user: otherUser } = await signup(app, {
      ...validSignup,
      email: "resume.other@example.com",
    });
    const [storedKey] = await readdir(resumeUploadDir);
    const path = join(resumeUploadDir, storedKey || "owned.pdf");
    const resume = await Resume.create({
      mimeType: "application/pdf",
      originalName: "owned.pdf",
      sizeBytes: validPdf.length,
      storage: { key: "owned.pdf", provider: "local" },
      userId: owner.id,
    });
    const resumeService = createResumeService({
      extractPdfText: async () => "Private owner context",
    });

    await expect(
      resumeService.extractPendingResume({
        path,
        resumeId: resume.id,
        userId: otherUser.id,
      }),
    ).rejects.toMatchObject({ code: "RESUME_NOT_FOUND", status: 404 });
    await expect(Resume.findById(resume.id)).resolves.toMatchObject({
      extractionStatus: "pending",
    });
  });
});
