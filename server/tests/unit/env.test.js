import { describe, expect, it } from "vitest";

import { ConfigurationError, loadConfig } from "../../src/config/env.js";

const validEnvironment = {
  AUTH_SECRET: "development-test-secret",
  CLIENT_ORIGIN: "http://localhost:5173",
  MONGODB_URI: "mongodb://localhost:27017/mockmateai-test",
};

describe("loadConfig", () => {
  it("returns validated local configuration", () => {
    expect(loadConfig(validEnvironment)).toMatchObject({
      aiProvider: "gemini",
      aiRequestTimeoutMs: 8000,
      clientOrigin: "http://localhost:5173",
      maxResumeSizeBytes: 5 * 1024 * 1024,
      nodeEnv: "development",
      port: 4444,
    });
  });

  it("rejects an invalid MongoDB URI without including its value", () => {
    expect(() =>
      loadConfig({ ...validEnvironment, MONGODB_URI: "not-a-database-uri" }),
    ).toThrow(
      new ConfigurationError("MONGODB_URI must use a MongoDB connection URI."),
    );
  });

  it("requires the selected provider key in production", () => {
    expect(() =>
      loadConfig({ ...validEnvironment, NODE_ENV: "production" }),
    ).toThrow(new ConfigurationError("GEMINI_API_KEY must be configured."));
  });

  it("rejects a client origin with a path", () => {
    expect(() =>
      loadConfig({
        ...validEnvironment,
        CLIENT_ORIGIN: "http://localhost:5173/app",
      }),
    ).toThrow(
      new ConfigurationError("CLIENT_ORIGIN must be a valid HTTP(S) origin."),
    );
  });

  it("rejects an invalid AI request timeout", () => {
    expect(() =>
      loadConfig({ ...validEnvironment, AI_REQUEST_TIMEOUT_MS: "0" }),
    ).toThrow(
      new ConfigurationError(
        "AI_REQUEST_TIMEOUT_MS must be a positive integer.",
      ),
    );
  });

  it("rejects an invalid resume size limit", () => {
    expect(() =>
      loadConfig({ ...validEnvironment, MAX_RESUME_SIZE_BYTES: "0" }),
    ).toThrow(
      new ConfigurationError(
        "MAX_RESUME_SIZE_BYTES must be a positive integer.",
      ),
    );
  });
});
