import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app.js";

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
