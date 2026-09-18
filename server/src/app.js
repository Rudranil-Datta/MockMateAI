import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import authRouter from "./routes/authRoutes.js";
import healthRouter from "./routes/healthRoutes.js";
import { createInterviewRouter } from "./routes/interviewRoutes.js";
import { createResumeRouter } from "./routes/resumeRoutes.js";
import { createAiProviderService } from "./services/aiProviderService.js";
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

export function createApp({
  aiProvider = "mock",
  aiProviderService,
  aiRequestTimeoutMs = 8000,
  clientOrigin = "http://localhost:5173",
  geminiApiKey,
  geminiModel,
  maxResumeSizeBytes = 5 * 1024 * 1024,
  resumeUploadDir = "/tmp/mockmateai-resumes",
} = {}) {
  const app = express();
  const providerService =
    aiProviderService ||
    createAiProviderService({
      aiProvider,
      geminiApiKey,
      geminiModel,
      timeoutMs: aiRequestTimeoutMs,
    });

  app.disable("x-powered-by");
  app.use(requestLogger);
  app.use(helmet());
  app.use(cors(createCorsOptions(clientOrigin)));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use("/api/auth", authRouter);
  app.use(
    "/api/interviews",
    createInterviewRouter({ aiProviderService: providerService }),
  );
  app.use(
    "/api/resumes",
    createResumeRouter({ maxResumeSizeBytes, resumeUploadDir }),
  );
  app.use("/health", healthRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
