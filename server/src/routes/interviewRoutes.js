import { Router } from "express";

import { createInterviewController } from "../controllers/interviewController.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { createInterviewService } from "../services/interviewService.js";

export function createInterviewRouter({ aiProviderService, resumeService }) {
  const interviewRouter = Router();
  const interviewService = createInterviewService({
    aiProviderService,
    resumeService,
  });
  const interviewController = createInterviewController({ interviewService });

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
    "/:id/complete",
    requireAuth,
    interviewController.completeInterview,
  );

  return interviewRouter;
}
