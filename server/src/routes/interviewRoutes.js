import { Router } from "express";

import { createInterviewController } from "../controllers/interviewController.js";
import { createVoiceAnswerController } from "../controllers/voiceAnswerController.js";
import { createAudioUpload } from "../middlewares/audioUpload.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { createInterviewService } from "../services/interviewService.js";

export function createInterviewRouter({
  aiProviderService,
  answerEvaluationService,
  audioUploadDir,
  maxAudioSizeBytes,
  resumeService,
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

  interviewRouter.post("/", requireAuth, interviewController.startInterview);
  interviewRouter.get("/:id", requireAuth, interviewController.getInterview);
  interviewRouter.post(
    "/:id/questions",
    requireAuth,
    interviewController.generateNextQuestion,
  );
  interviewRouter.post(
    "/:id/answers",
    requireAuth,
    interviewController.submitTextAnswer,
  );
  interviewRouter.post(
    "/:id/voice-answers",
    requireAuth,
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
