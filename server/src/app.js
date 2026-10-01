import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { createRateLimit, getRequestIp } from "./middlewares/rateLimit.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { createAnalyticsRouter } from "./routes/analyticsRoutes.js";
import { createAuthRouter } from "./routes/authRoutes.js";
import healthRouter from "./routes/healthRoutes.js";
import { createInterviewRouter } from "./routes/interviewRoutes.js";
import { createResumeRouter } from "./routes/resumeRoutes.js";
import { createAiProviderService } from "./services/aiProviderService.js";
import { createAnalyticsService } from "./services/analyticsService.js";
import { createAnswerEvaluationService } from "./services/answerEvaluationService.js";
import { createResumeService } from "./services/resumeService.js";
import { createTranscriptionService } from "./services/transcriptionService.js";
import { createVoiceAnswerService } from "./services/voiceAnswerService.js";
import { AppError } from "./utils/AppError.js";

function createCorsOptions(clientOrigin) {
  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || origin === clientOrigin) {
        callback(null, true);
        return;
      }

      callback(
        new AppError("CORS_ORIGIN_DENIED", "Request origin is not allowed.", {
          status: 403,
        }),
      );
    },
  };
}

function getNextUtcDay(currentTime) {
  const currentDate = new Date(currentTime);
  return Date.UTC(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth(),
    currentDate.getUTCDate() + 1,
  );
}

export function createApp({
  aiRequestsPerDay = 100_000,
  aiRequestsPerIpPerHour = 10_000,
  aiRequestsPerUserPerHour = 10_000,
  aiProvider = "mock",
  aiProviderService,
  aiRequestTimeoutMs = 8000,
  analyticsService,
  audioUploadDir = "/tmp/mockmateai-audio",
  authRequestsPerIpPer15Minutes = 10_000,
  clientOrigin = "http://localhost:5173",
  geminiApiKey,
  geminiModel,
  geminiTranscriptionModel,
  jsonBodyLimitBytes = 100 * 1024,
  maxAudioSizeBytes = 5 * 1024 * 1024,
  maxResumeSizeBytes = 5 * 1024 * 1024,
  questionCacheTtlMs = 60_000,
  rateLimitNow,
  resumeService,
  resumeUploadDir = "/tmp/mockmateai-resumes",
  transcriptionService,
  uploadsPerIpPerHour = 10_000,
  uploadsPerUserPerHour = 10_000,
  voiceAnswerService,
} = {}) {
  const app = express();
  const providerService =
    aiProviderService ||
    createAiProviderService({
      aiProvider,
      geminiApiKey,
      geminiModel,
      questionCacheTtlMs,
      timeoutMs: aiRequestTimeoutMs,
    });
  const ownedAnalyticsService = analyticsService || createAnalyticsService();
  const ownedResumeService = resumeService || createResumeService();
  const answerEvaluationService = createAnswerEvaluationService({
    aiProviderService: providerService,
  });
  const ownedVoiceAnswerService =
    voiceAnswerService ||
    createVoiceAnswerService({
      answerEvaluationService,
      transcriptionService:
        transcriptionService ||
        createTranscriptionService({
          aiProvider,
          geminiApiKey,
          geminiTranscriptionModel,
          timeoutMs: aiRequestTimeoutMs,
        }),
    });
  const authRateLimit = createRateLimit({
    code: "AUTH_RATE_LIMITED",
    message: "Too many authentication attempts. Try again later.",
    now: rateLimitNow,
    rules: [
      {
        key: getRequestIp,
        limit: authRequestsPerIpPer15Minutes,
        name: "auth-ip",
        windowMs: 15 * 60 * 1000,
      },
    ],
  });
  const aiRateLimit = createRateLimit({
    code: "AI_RATE_LIMITED",
    message:
      "AI practice limit reached. Your saved work is safe; try again later.",
    now: rateLimitNow,
    rules: [
      {
        key: (request) => request.auth.userId,
        limit: aiRequestsPerUserPerHour,
        name: "ai-user",
        windowMs: 60 * 60 * 1000,
      },
      {
        key: getRequestIp,
        limit: aiRequestsPerIpPerHour,
        name: "ai-ip",
        windowMs: 60 * 60 * 1000,
      },
      {
        key: () => "application",
        limit: aiRequestsPerDay,
        name: "ai-application",
        resetAt: getNextUtcDay,
      },
    ],
  });
  const uploadRateLimit = createRateLimit({
    code: "UPLOAD_RATE_LIMITED",
    message: "Upload limit reached. Try again later.",
    now: rateLimitNow,
    rules: [
      {
        key: (request) => request.auth.userId,
        limit: uploadsPerUserPerHour,
        name: "upload-user",
        windowMs: 60 * 60 * 1000,
      },
      {
        key: getRequestIp,
        limit: uploadsPerIpPerHour,
        name: "upload-ip",
        windowMs: 60 * 60 * 1000,
      },
    ],
  });

  app.disable("x-powered-by");
  app.use(requestLogger);
  app.use(helmet());
  app.use(cors(createCorsOptions(clientOrigin)));
  app.use(express.json({ limit: jsonBodyLimitBytes }));
  app.use(cookieParser());
  app.use("/api/auth", createAuthRouter({ authRateLimit }));
  app.use(
    "/api/analytics",
    createAnalyticsRouter({ analyticsService: ownedAnalyticsService }),
  );
  app.use(
    "/api/interviews",
    createInterviewRouter({
      aiRateLimit,
      aiProviderService: providerService,
      answerEvaluationService,
      audioUploadDir,
      maxAudioSizeBytes,
      resumeService: ownedResumeService,
      uploadRateLimit,
      voiceAnswerService: ownedVoiceAnswerService,
    }),
  );
  app.use(
    "/api/resumes",
    createResumeRouter({
      maxResumeSizeBytes,
      resumeService: ownedResumeService,
      resumeUploadDir,
      uploadRateLimit,
    }),
  );
  app.use("/health", healthRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
