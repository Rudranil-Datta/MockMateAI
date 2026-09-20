import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const allowedAiProviders = new Set(["gemini", "mock"]);
const defaultResumeUploadDir = fileURLToPath(
  new URL("../../uploads/resumes", import.meta.url),
);

export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function requiredValue(environment, name) {
  const value = environment[name]?.trim();

  if (!value) {
    throw new ConfigurationError(`${name} must be configured.`);
  }

  return value;
}

function parsePort(value) {
  if (value === undefined || value === "") {
    return 4444;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigurationError(
      "PORT must be an integer between 1 and 65535.",
    );
  }

  return port;
}

function parseMongoUri(value) {
  const uri = requiredValue(value, "MONGODB_URI");
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new ConfigurationError(
      "MONGODB_URI must use a MongoDB connection URI.",
    );
  }

  return uri;
}

function parseClientOrigin(environment) {
  const origin = requiredValue(environment, "CLIENT_ORIGIN");

  try {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) {
      throw new Error("Unsupported protocol");
    }

    return url.origin;
  } catch {
    throw new ConfigurationError(
      "CLIENT_ORIGIN must be a valid HTTP(S) origin.",
    );
  }
}

function parseAuthSecret(environment, nodeEnv) {
  const authSecret = requiredValue(environment, "AUTH_SECRET");

  if (nodeEnv === "production" && Buffer.byteLength(authSecret, "utf8") < 32) {
    throw new ConfigurationError(
      "AUTH_SECRET must contain at least 32 bytes in production.",
    );
  }

  return authSecret;
}

function optionalPositiveInteger(value, name, defaultValue, maximum) {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new ConfigurationError(`${name} must be a positive integer.`);
  }

  if (maximum && parsedValue > maximum) {
    throw new ConfigurationError(`${name} must not exceed ${maximum}.`);
  }

  return parsedValue;
}

export function loadConfig(environment = process.env) {
  const nodeEnv = environment.NODE_ENV?.trim() || "development";
  const aiProvider = environment.AI_PROVIDER?.trim() || "gemini";

  if (!allowedAiProviders.has(aiProvider)) {
    throw new ConfigurationError("AI_PROVIDER must be gemini or mock.");
  }

  const config = {
    nodeEnv,
    port: parsePort(environment.PORT),
    mongoUri: parseMongoUri(environment),
    aiProvider,
    authSecret: parseAuthSecret(environment, nodeEnv),
    clientOrigin: parseClientOrigin(environment),
    aiRequestTimeoutMs: optionalPositiveInteger(
      environment.AI_REQUEST_TIMEOUT_MS,
      "AI_REQUEST_TIMEOUT_MS",
      8000,
      20_000,
    ),
    geminiModel: environment.GEMINI_MODEL?.trim() || "gemini-3.6-flash",
    maxResumeSizeBytes: optionalPositiveInteger(
      environment.MAX_RESUME_SIZE_BYTES,
      "MAX_RESUME_SIZE_BYTES",
      5 * 1024 * 1024,
      5 * 1024 * 1024,
    ),
    resumeUploadDir: resolve(
      environment.RESUME_UPLOAD_DIR?.trim() || defaultResumeUploadDir,
    ),
  };

  if (nodeEnv === "production" && aiProvider === "gemini") {
    config.geminiApiKey = requiredValue(environment, "GEMINI_API_KEY");
  } else if (environment.GEMINI_API_KEY?.trim()) {
    config.geminiApiKey = environment.GEMINI_API_KEY.trim();
  }

  return Object.freeze(config);
}
