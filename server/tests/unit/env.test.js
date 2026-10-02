import { describe, expect, it } from "vitest";

import { ConfigurationError, loadConfig } from "../../src/config/env.js";

const validEnvironment = {
  AUTH_SECRET: "development-test-secret-at-least-32-bytes",
  CLIENT_ORIGIN: "http://localhost:5173",
  MONGODB_URI: "mongodb://localhost:27017/mockmateai-test",
};
const validProductionEnvironment = {
  ...validEnvironment,
  AUDIO_UPLOAD_DIR: "/tmp/mockmateai-audio",
  CLIENT_ORIGIN: "https://mockmateai.example",
  MONGODB_DB_NAME: "mockmateai",
  NODE_ENV: "production",
  RESUME_UPLOAD_DIR: "/tmp/mockmateai-resumes",
  TRUST_PROXY: "render",
};

describe("loadConfig", () => {
  it("returns validated local configuration", () => {
    expect(loadConfig(validEnvironment)).toMatchObject({
      aiProvider: "gemini",
      aiRequestsPerDay: 200,
      aiRequestsPerIpPerHour: 60,
      aiRequestsPerUserPerHour: 20,
      aiRequestTimeoutMs: 8000,
      authRequestsPerIpPer15Minutes: 20,
      clientOrigin: "http://localhost:5173",
      geminiTranscriptionModel: "gemini-3.6-flash",
      jsonBodyLimitBytes: 100 * 1024,
      maxAudioSizeBytes: 5 * 1024 * 1024,
      maxResumeSizeBytes: 5 * 1024 * 1024,
      mongoDbName: "mockmateai-test",
      mongodbReadinessTimeoutMs: 1000,
      nodeEnv: "development",
      port: 4444,
      questionCacheTtlMs: 60_000,
      uploadsPerIpPerHour: 30,
      uploadsPerUserPerHour: 10,
      trustProxy: "direct",
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
    expect(() => loadConfig(validProductionEnvironment)).toThrow(
      new ConfigurationError("GEMINI_API_KEY must be configured."),
    );
  });

  it("rejects a weak production authentication secret", () => {
    expect(() =>
      loadConfig({
        ...validProductionEnvironment,
        AI_PROVIDER: "mock",
        AUTH_SECRET: "too-short",
      }),
    ).toThrow(
      new ConfigurationError(
        "AUTH_SECRET must contain at least 32 bytes in production.",
      ),
    );
  });

  it("requires explicit production database, proxy, HTTPS, and upload paths", () => {
    expect(() =>
      loadConfig({
        ...validProductionEnvironment,
        AI_PROVIDER: "mock",
        MONGODB_DB_NAME: "",
        MONGODB_URI: "mongodb+srv://user:password@example.invalid/",
      }),
    ).toThrow(
      new ConfigurationError(
        "MONGODB_DB_NAME must be configured in production.",
      ),
    );
    expect(() =>
      loadConfig({
        ...validProductionEnvironment,
        AI_PROVIDER: "mock",
        TRUST_PROXY: "direct",
      }),
    ).toThrow(
      new ConfigurationError("TRUST_PROXY must be render in production."),
    );
    expect(() =>
      loadConfig({
        ...validProductionEnvironment,
        AI_PROVIDER: "mock",
        CLIENT_ORIGIN: "http://mockmateai.example",
      }),
    ).toThrow(
      new ConfigurationError("CLIENT_ORIGIN must be a valid HTTP(S) origin."),
    );
    expect(() =>
      loadConfig({
        ...validProductionEnvironment,
        AI_PROVIDER: "mock",
        RESUME_UPLOAD_DIR: "relative/resumes",
      }),
    ).toThrow(
      new ConfigurationError(
        "RESUME_UPLOAD_DIR must be an absolute path in production.",
      ),
    );
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
    expect(() =>
      loadConfig({ ...validEnvironment, AI_REQUEST_TIMEOUT_MS: "20001" }),
    ).toThrow(
      new ConfigurationError("AI_REQUEST_TIMEOUT_MS must not exceed 20000."),
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
    expect(() =>
      loadConfig({
        ...validEnvironment,
        MAX_RESUME_SIZE_BYTES: String(5 * 1024 * 1024 + 1),
      }),
    ).toThrow(
      new ConfigurationError("MAX_RESUME_SIZE_BYTES must not exceed 5242880."),
    );
  });

  it("rejects an invalid audio size limit", () => {
    expect(() =>
      loadConfig({ ...validEnvironment, MAX_AUDIO_SIZE_BYTES: "0" }),
    ).toThrow(
      new ConfigurationError(
        "MAX_AUDIO_SIZE_BYTES must be a positive integer.",
      ),
    );
    expect(() =>
      loadConfig({
        ...validEnvironment,
        MAX_AUDIO_SIZE_BYTES: String(5 * 1024 * 1024 + 1),
      }),
    ).toThrow(
      new ConfigurationError("MAX_AUDIO_SIZE_BYTES must not exceed 5242880."),
    );
  });

  it.each([
    ["AI_REQUESTS_PER_USER_PER_HOUR", "0", "must be a positive integer"],
    ["AI_REQUESTS_PER_IP_PER_HOUR", "5001", "must not exceed 5000"],
    ["AI_REQUESTS_PER_DAY", "100001", "must not exceed 100000"],
    ["AUTH_REQUESTS_PER_IP_PER_15_MINUTES", "0", "must be a positive integer"],
    ["UPLOADS_PER_USER_PER_HOUR", "1001", "must not exceed 1000"],
    ["UPLOADS_PER_IP_PER_HOUR", "0", "must be a positive integer"],
    ["JSON_BODY_LIMIT_BYTES", "102401", "must not exceed 102400"],
    ["QUESTION_CACHE_TTL_MS", "300001", "must not exceed 300000"],
  ])("rejects invalid %s", (name, value, expectedMessage) => {
    expect(() => loadConfig({ ...validEnvironment, [name]: value })).toThrow(
      new ConfigurationError(`${name} ${expectedMessage}.`),
    );
  });
});
