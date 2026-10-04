import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import JobTarget from "../../src/models/JobTarget.js";
import { createAiProviderService } from "../../src/services/aiProviderService.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

useMongoTestDatabase();

const description =
  "Build secure Node.js APIs with MongoDB, ownership controls, automated tests, and reliable deployment practices.";
const analysis = {
  requirements: [
    {
      evidenceTerms: ["Node.js APIs"],
      key: "backend-development",
      label: "Backend development",
      priority: "required",
    },
  ],
  roleSummary:
    "Build secure backend services and explain practical engineering trade-offs clearly.",
  skills: [
    {
      key: "node-js",
      label: "Node.js",
      sourceRequirementKeys: ["backend-development"],
      weight: 5,
    },
  ],
};
const keys = {
  create: "11111111-1111-4111-8111-111111111111",
  patch: "22222222-2222-4222-8222-222222222222",
  retry: "33333333-3333-4333-8333-333333333333",
};

function provider(overrides = {}) {
  return {
    analyzeJobTarget: vi.fn().mockResolvedValue(analysis),
    evaluateAnswer: vi.fn(),
    generateQuestion: vi.fn(),
    ...overrides,
  };
}

async function signup(app, email = "target.owner@example.com") {
  const response = await request(app).post("/api/auth/signup").send({
    email,
    name: "Target Owner",
    password: "secure-password-123",
  });
  return {
    cookie: response.headers["set-cookie"][0].split(";")[0],
    user: response.body.user,
  };
}

function createBody(overrides = {}) {
  return {
    company: "Example",
    description,
    idempotencyKey: keys.create,
    title: "Backend Engineer",
    ...overrides,
  };
}

describe("Job Target routes", () => {
  it("creates, replays, lists, and reads a bounded owned ready target", async () => {
    const aiProviderService = provider();
    const app = createApp({ aiProviderService });
    const { cookie } = await signup(app);

    const created = await request(app)
      .post("/api/job-targets")
      .set("Cookie", cookie)
      .send(createBody());
    const replay = await request(app)
      .post("/api/job-targets")
      .set("Cookie", cookie)
      .send(createBody());
    const listed = await request(app)
      .get("/api/job-targets")
      .set("Cookie", cookie);
    const read = await request(app)
      .get(`/api/job-targets/${created.body.target.id}`)
      .set("Cookie", cookie);

    expect(created.status).toBe(201);
    expect(created.body.target).toMatchObject({
      analysis,
      company: "Example",
      description,
      status: "ready",
      title: "Backend Engineer",
    });
    expect(replay.body).toEqual(created.body);
    expect(listed.body).toEqual({ items: [created.body.target] });
    expect(read.body).toEqual(created.body);
    expect(aiProviderService.analyzeJobTarget).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(created.body)).not.toContain("analysisClaimId");
    expect(JSON.stringify(created.body)).not.toContain("analysisRequestId");
  });

  it("validates before provider work and protects every route", async () => {
    const aiProviderService = provider();
    const app = createApp({ aiProviderService });
    const { cookie } = await signup(app);
    const invalid = await request(app)
      .post("/api/job-targets")
      .set("Cookie", cookie)
      .send(createBody({ extra: true }));
    const unauthenticated = await request(app).get("/api/job-targets");
    const invalidId = await request(app)
      .get("/api/job-targets/bad")
      .set("Cookie", cookie);

    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
    expect(unauthenticated.status).toBe(401);
    expect(invalidId.status).toBe(400);
    expect(aiProviderService.analyzeJobTarget).not.toHaveBeenCalled();
  });

  it("hides foreign targets across read, patch, analyze, and delete", async () => {
    const app = createApp({ aiProviderService: provider() });
    const owner = await signup(app);
    const other = await signup(app, "target.other@example.com");
    const created = await request(app)
      .post("/api/job-targets")
      .set("Cookie", owner.cookie)
      .send(createBody());
    const id = created.body.target.id;

    const responses = await Promise.all([
      request(app).get(`/api/job-targets/${id}`).set("Cookie", other.cookie),
      request(app)
        .patch(`/api/job-targets/${id}`)
        .set("Cookie", other.cookie)
        .send({ idempotencyKey: keys.patch, title: "Other title" }),
      request(app)
        .post(`/api/job-targets/${id}/analyze`)
        .set("Cookie", other.cookie)
        .send({ idempotencyKey: keys.retry }),
      request(app).delete(`/api/job-targets/${id}`).set("Cookie", other.cookie),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("JOB_TARGET_NOT_FOUND");
    }
  });

  it("updates with reanalysis, rejects key reuse, clears company, and deletes", async () => {
    const aiProviderService = provider();
    const app = createApp({ aiProviderService });
    const { cookie } = await signup(app);
    const created = await request(app)
      .post("/api/job-targets")
      .set("Cookie", cookie)
      .send(createBody());
    const id = created.body.target.id;

    const updated = await request(app)
      .patch(`/api/job-targets/${id}`)
      .set("Cookie", cookie)
      .send({
        company: null,
        idempotencyKey: keys.patch,
        title: "Senior Backend Engineer",
      });
    const conflictingReplay = await request(app)
      .patch(`/api/job-targets/${id}`)
      .set("Cookie", cookie)
      .send({ idempotencyKey: keys.patch, title: "Different title" });
    const deleted = await request(app)
      .delete(`/api/job-targets/${id}`)
      .set("Cookie", cookie);
    const missing = await request(app)
      .get(`/api/job-targets/${id}`)
      .set("Cookie", cookie);

    expect(updated.status).toBe(200);
    expect(updated.body.target.title).toBe("Senior Backend Engineer");
    expect(updated.body.target).not.toHaveProperty("company");
    expect(conflictingReplay.status).toBe(409);
    expect(conflictingReplay.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(deleted.status).toBe(204);
    expect(missing.status).toBe(404);
    expect(aiProviderService.analyzeJobTarget).toHaveBeenCalledTimes(2);
  });

  it("persists truthful failed state and retries with a new key", async () => {
    const generateContent = vi
      .fn()
      .mockRejectedValueOnce({ code: "RESOURCE_EXHAUSTED", status: 429 })
      .mockResolvedValueOnce({ text: JSON.stringify(analysis) });
    const app = createApp({
      aiProviderService: createAiProviderService({
        aiProvider: "gemini",
        generateContent,
      }),
    });
    const { cookie, user } = await signup(app);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failed = await request(app)
      .post("/api/job-targets")
      .set("Cookie", cookie)
      .send(createBody());
    const storedFailure = await JobTarget.findOne({ userId: user.id });
    const retried = await request(app)
      .post(`/api/job-targets/${storedFailure.id}/analyze`)
      .set("Cookie", cookie)
      .send({ idempotencyKey: keys.retry });

    expect(failed.status).toBe(429);
    expect(failed.body.error.code).toBe("AI_QUOTA_EXCEEDED");
    expect(storedFailure.status).toBe("analysis_failed");
    expect(storedFailure.analysis).toBeUndefined();
    expect(storedFailure.analysisFailureCode).toBe("quota");
    expect(retried.status).toBe(200);
    expect(retried.body.target.status).toBe("ready");
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(description);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("Node.js APIs");
    errorSpy.mockRestore();
  });

  it("applies AI limits only to analysis actions", async () => {
    const app = createApp({
      aiProviderService: provider(),
      aiRequestsPerUserPerHour: 1,
    });
    const { cookie } = await signup(app);
    const created = await request(app)
      .post("/api/job-targets")
      .set("Cookie", cookie)
      .send(createBody());
    const listed = await request(app)
      .get("/api/job-targets")
      .set("Cookie", cookie);
    const limited = await request(app)
      .patch(`/api/job-targets/${created.body.target.id}`)
      .set("Cookie", cookie)
      .send({ idempotencyKey: keys.patch, title: "Senior Backend Engineer" });

    expect(created.status).toBe(201);
    expect(listed.status).toBe(200);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("AI_RATE_LIMITED");
  });

  it("allows one concurrent provider operation and reports fresh claims", async () => {
    let release;
    let markEntered;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    const entered = new Promise((resolve) => {
      markEntered = resolve;
    });
    const analyzeJobTarget = vi.fn().mockImplementation(() => {
      markEntered();
      return pending;
    });
    const app = createApp({
      aiProviderService: provider({ analyzeJobTarget }),
    });
    const { cookie } = await signup(app);

    const firstRequest = request(app)
      .post("/api/job-targets")
      .set("Cookie", cookie)
      .send(createBody())
      .then((response) => response);
    await entered;
    const concurrent = await request(app)
      .post("/api/job-targets")
      .set("Cookie", cookie)
      .send(createBody());
    release(analysis);
    const first = await firstRequest;

    expect(first.status).toBe(201);
    expect(concurrent.status).toBe(409);
    expect(concurrent.body.error.code).toBe("JOB_TARGET_ANALYSIS_IN_PROGRESS");
    expect(analyzeJobTarget).toHaveBeenCalledTimes(1);
  });

  it("reclaims a stale pending analysis without exposing lease fields", async () => {
    const aiProviderService = provider();
    const app = createApp({ aiProviderService });
    const { cookie, user } = await signup(app);
    const stale = await JobTarget.create({
      analysisClaimId: "stale-claim",
      analysisRequestId: keys.create,
      analysisStartedAt: new Date(Date.now() - 31_000),
      company: "Example",
      description,
      status: "analysis_pending",
      title: "Backend Engineer",
      userId: user.id,
    });

    const response = await request(app)
      .post("/api/job-targets")
      .set("Cookie", cookie)
      .send(createBody());

    expect(response.status).toBe(201);
    expect(response.body.target).toMatchObject({
      id: stale.id,
      status: "ready",
    });
    expect(JSON.stringify(response.body)).not.toContain("Claim");
    expect(aiProviderService.analyzeJobTarget).toHaveBeenCalledTimes(1);
  });

  it("keeps final-write failure truthful and recoverable", async () => {
    const aiProviderService = provider();
    const app = createApp({ aiProviderService });
    const { cookie, user } = await signup(app);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const finalizeSpy = vi
      .spyOn(JobTarget, "findOneAndUpdate")
      .mockRejectedValueOnce(new Error("private finalize detail"));

    const response = await request(app)
      .post("/api/job-targets")
      .set("Cookie", cookie)
      .send(createBody());
    const stored = await JobTarget.findOne({ userId: user.id });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(stored.status).toBe("analysis_pending");
    expect(stored.analysis).toBeUndefined();
    expect(aiProviderService.analyzeJobTarget).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
      "private finalize detail",
    );
    finalizeSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("keeps failed-transition persistence failure pending for stale recovery", async () => {
    const aiProviderService = provider({
      analyzeJobTarget: vi.fn().mockRejectedValue(
        Object.assign(new Error("provider unavailable"), {
          code: "AI_PROVIDER_UNAVAILABLE",
          status: 502,
        }),
      ),
    });
    const app = createApp({ aiProviderService });
    const { cookie, user } = await signup(app);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const transitionSpy = vi
      .spyOn(JobTarget, "findOneAndUpdate")
      .mockRejectedValueOnce(new Error("private transition detail"));

    const response = await request(app)
      .post("/api/job-targets")
      .set("Cookie", cookie)
      .send(createBody());
    const stored = await JobTarget.findOne({ userId: user.id });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(stored.status).toBe("analysis_pending");
    expect(stored.analysis).toBeUndefined();
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
      "private transition detail",
    );
    transitionSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("returns safe persistence failures without provider work or leaked details", async () => {
    const aiProviderService = provider();
    const app = createApp({ aiProviderService });
    const { cookie } = await signup(app);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const createSpy = vi
      .spyOn(JobTarget, "create")
      .mockRejectedValueOnce(new Error("private database detail"));

    const response = await request(app)
      .post("/api/job-targets")
      .set("Cookie", cookie)
      .send(createBody());

    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again later.",
    });
    expect(aiProviderService.analyzeJobTarget).not.toHaveBeenCalled();
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
      "private database detail",
    );
    createSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
