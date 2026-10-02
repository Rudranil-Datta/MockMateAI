import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import app, { createApp } from "../../src/app.js";

describe("GET /health", () => {
  it("returns a safe health response", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("allows credentialed CORS only for configured origin", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("allows preflight only for the configured credentialed origin", async () => {
    const response = await request(app)
      .options("/api/interviews")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("rejects a different browser origin safely", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "https://untrusted.example");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: "CORS_ORIGIN_DENIED",
        message: "Request origin is not allowed.",
      },
    });
  });

  it("returns safe errors for oversized JSON requests", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ padding: "x".repeat(102_400) });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request is too large.",
      },
    });
  });

  it("returns a stable safe error for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"password":"private-value",');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "MALFORMED_JSON",
        message: "Request body must contain valid JSON.",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("private-value");
    expect(JSON.stringify(response.body)).not.toContain("position");
  });

  it("sets baseline security headers", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["content-security-policy"]).toBeTruthy();
    expect(response.headers["referrer-policy"]).toBeTruthy();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });

  it("returns safe errors for unknown routes", async () => {
    const response = await request(app).get("/missing");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
      },
    });
  });
});

describe("GET /ready", () => {
  it("reports readiness only when MongoDB responds", async () => {
    const readyApp = createApp({
      databaseReadiness: async () => true,
      mongodbReadinessTimeoutMs: 321,
    });
    const unavailableApp = createApp({
      databaseReadiness: async () => false,
    });

    const readyResponse = await request(readyApp).get("/ready");
    const unavailableResponse = await request(unavailableApp).get("/ready");

    expect(readyResponse.status).toBe(200);
    expect(readyResponse.body).toEqual({ status: "ready" });
    expect(unavailableResponse.status).toBe(503);
    expect(unavailableResponse.body).toEqual({ status: "unavailable" });
  });

  it("configures the single trusted Render proxy boundary explicitly", () => {
    expect(createApp().get("trust proxy")).toBe(false);
    expect(createApp({ trustProxy: "render" }).get("trust proxy")).toBe(1);
  });
});

describe("request logging", () => {
  it("accepts bounded request IDs and replaces unsafe values", async () => {
    const safeResponse = await request(app)
      .get("/health")
      .set("x-request-id", "render-request_123");
    const unsafeRequestId = "x".repeat(129);
    const unsafeResponse = await request(app)
      .get("/health")
      .set("x-request-id", unsafeRequestId);

    expect(safeResponse.headers["x-request-id"]).toBe("render-request_123");
    expect(unsafeResponse.headers["x-request-id"]).not.toBe(unsafeRequestId);
    expect(unsafeResponse.headers["x-request-id"]).toMatch(/^[a-f0-9-]{36}$/);
  });

  it("does not log query values or unsafe supplied request IDs", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const unsafeRequestId = "private-token-".repeat(20);

    await request(app)
      .get("/health?password=private-password")
      .set("x-request-id", unsafeRequestId);

    const loggedData = JSON.stringify(infoSpy.mock.calls);
    expect(loggedData).not.toContain("private-password");
    expect(loggedData).not.toContain(unsafeRequestId);
  });
});
