import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import { createTestPdf } from "../helpers/createTestPdf.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

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

async function signup(app, email) {
  const response = await request(app).post("/api/auth/signup").send({
    email,
    name: "Rate Limit Tester",
    password: "secure-password-123",
  });

  return getSessionCookie(response);
}

describe("Day 29 route limits", () => {
  it("limits signup/login attempts by IP and returns Retry-After", async () => {
    const app = createApp({ authRequestsPerIpPer15Minutes: 1 });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    const first = await request(app).post("/api/auth/login").send({
      email: "missing@example.com",
      password: "secure-password-123",
    });
    const blocked = await request(app).post("/api/auth/login").send({
      email: "missing@example.com",
      password: "secure-password-123",
    });

    expect(first.status).toBe(401);
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBe("900");
    expect(blocked.body.error).toEqual({
      code: "AUTH_RATE_LIMITED",
      message: "Too many authentication attempts. Try again later.",
    });
    const serializedLog = JSON.stringify(errorLog.mock.calls);
    expect(serializedLog).toContain("AUTH_RATE_LIMITED");
    expect(serializedLog).not.toContain("missing@example.com");
    expect(serializedLog).not.toContain("secure-password-123");
  });

  it("uses only the client address selected by the single Render proxy hop", async () => {
    const app = createApp({
      authRequestsPerIpPer15Minutes: 1,
      trustProxy: "render",
    });

    const first = await request(app)
      .post("/api/auth/login")
      .set("x-forwarded-for", "203.0.113.10, 198.51.100.20")
      .send({ email: "missing@example.com", password: "secure-password-123" });
    const spoofedLeftAddress = await request(app)
      .post("/api/auth/login")
      .set("x-forwarded-for", "203.0.113.99, 198.51.100.20")
      .send({ email: "missing@example.com", password: "secure-password-123" });
    const differentProxySelectedAddress = await request(app)
      .post("/api/auth/login")
      .set("x-forwarded-for", "203.0.113.10, 198.51.100.21")
      .send({ email: "missing@example.com", password: "secure-password-123" });

    expect(first.status).toBe(401);
    expect(spoofedLeftAddress.status).toBe(429);
    expect(differentProxySelectedAddress.status).toBe(401);
  });

  it("limits authenticated AI actions before a second provider call", async () => {
    const generateQuestion = vi
      .fn()
      .mockResolvedValue({ prompt: "Explain a bounded queue." });
    const app = createApp({
      aiProviderService: {
        evaluateAnswer: vi.fn(),
        generateQuestion,
      },
      aiRequestsPerUserPerHour: 1,
    });
    const cookie = await signup(app, "ai-limit@example.com");

    const first = await request(app)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
      });
    const blocked = await request(app)
      .post("/api/interviews")
      .set("Cookie", cookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
      });

    expect(first.status).toBe(201);
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBe("3600");
    expect(blocked.body.error.code).toBe("AI_RATE_LIMITED");
    expect(generateQuestion).toHaveBeenCalledTimes(1);
  });

  it("enforces shared IP and application AI caps", async () => {
    const generateQuestion = vi
      .fn()
      .mockResolvedValue({ prompt: "Explain bounded work." });
    const ipLimitedApp = createApp({
      aiProviderService: { evaluateAnswer: vi.fn(), generateQuestion },
      aiRequestsPerIpPerHour: 1,
    });
    const firstCookie = await signup(ipLimitedApp, "ip-one@example.com");
    const secondCookie = await signup(ipLimitedApp, "ip-two@example.com");

    const first = await request(ipLimitedApp)
      .post("/api/interviews")
      .set("Cookie", firstCookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
      });
    const ipBlocked = await request(ipLimitedApp)
      .post("/api/interviews")
      .set("Cookie", secondCookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "HR",
        level: "beginner",
      });

    expect(first.status).toBe(201);
    expect(ipBlocked.status).toBe(429);
    expect(ipBlocked.body.error.code).toBe("AI_RATE_LIMITED");

    const applicationGenerate = vi
      .fn()
      .mockResolvedValue({ prompt: "Explain application limits." });
    let currentTime = Date.UTC(2026, 8, 27, 23, 59, 0);
    const applicationLimitedApp = createApp({
      aiProviderService: {
        evaluateAnswer: vi.fn(),
        generateQuestion: applicationGenerate,
      },
      aiRequestsPerDay: 1,
      rateLimitNow: () => currentTime,
    });
    const applicationCookie = await signup(
      applicationLimitedApp,
      "application-limit@example.com",
    );
    const applicationFirst = await request(applicationLimitedApp)
      .post("/api/interviews")
      .set("Cookie", applicationCookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "DSA",
        level: "intermediate",
      });
    const applicationBlocked = await request(applicationLimitedApp)
      .post("/api/interviews")
      .set("Cookie", applicationCookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "HR",
        level: "beginner",
      });

    expect(applicationFirst.status).toBe(201);
    expect(applicationBlocked.status).toBe(429);
    expect(applicationBlocked.headers["retry-after"]).toBe("60");
    expect(applicationBlocked.body.error.code).toBe("AI_RATE_LIMITED");
    currentTime += 60_000;
    const afterUtcReset = await request(applicationLimitedApp)
      .post("/api/interviews")
      .set("Cookie", applicationCookie)
      .send({
        idempotencyKey: randomUUID(),
        interviewType: "System Design",
        level: "advanced",
      });
    expect(afterUtcReset.status).toBe(201);
    expect(applicationGenerate).toHaveBeenCalledTimes(2);
  });

  it("limits uploads before multipart disk work", async () => {
    const resumeUploadDir = await mkdtemp(
      join(tmpdir(), "mockmateai-rate-limit-"),
    );
    uploadDirectories.push(resumeUploadDir);
    const app = createApp({
      resumeUploadDir,
      uploadsPerUserPerHour: 1,
    });
    const cookie = await signup(app, "upload-limit@example.com");

    const first = await request(app)
      .post("/api/resumes")
      .set("Cookie", cookie)
      .attach("resume", createTestPdf("Bounded resume"), {
        contentType: "application/pdf",
        filename: "resume.pdf",
      });
    const filesAfterFirst = await readdir(resumeUploadDir);
    const blocked = await request(app)
      .post("/api/resumes")
      .set("Cookie", cookie)
      .attach("resume", createTestPdf("Blocked resume"), {
        contentType: "application/pdf",
        filename: "resume.pdf",
      });
    const filesAfterBlocked = await readdir(resumeUploadDir);

    expect(first.status).toBe(201);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("UPLOAD_RATE_LIMITED");
    expect(filesAfterBlocked).toEqual(filesAfterFirst);
  });
});
