import { Router } from "express";

import { createInterviewController } from "../controllers/interviewController.js";
import { createVoiceAnswerController } from "../controllers/voiceAnswerController.js";
import { createAudioUpload } from "../middlewares/audioUpload.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { createInterviewService } from "../services/interviewService.js";

export function createInterviewRouter({
  aiRateLimit,
  aiProviderService,
  answerEvaluationService,
  audioUploadDir,
  maxAudioSizeBytes,
  resumeService,
  uploadRateLimit,
  voiceAnswerService,
}) {
  const interviewRouter = Router();
  const interviewService = createInterviewService({
    aiProviderService,
    answerEvaluationService,
    resumeService,
  });
  const interviewController = createInterviewController({ interviewService });
  const voiceAnswerController = createVoiceAnswerController({
    voiceAnswerService,
  });
  const uploadAudio = createAudioUpload({
    audioUploadDir,
    maxAudioSizeBytes,
  });

  interviewRouter.post(
    "/",
    requireAuth,
    aiRateLimit,
    interviewController.startInterview,
  );
  interviewRouter.get("/:id", requireAuth, interviewController.getInterview);
  interviewRouter.post(
    "/:id/questions",
    requireAuth,
    aiRateLimit,
    interviewController.generateNextQuestion,
  );
  interviewRouter.post(
    "/:id/answers",
    requireAuth,
    aiRateLimit,
    interviewController.submitTextAnswer,
  );
  interviewRouter.post(
    "/:id/voice-answers",
    requireAuth,
    aiRateLimit,
    uploadRateLimit,
    voiceAnswerController.preflight,
    uploadAudio,
    voiceAnswerController.transcribe,
  );
  interviewRouter.post(
    "/:id/complete",
    requireAuth,
    interviewController.completeInterview,
  );

  return interviewRouter;
}
