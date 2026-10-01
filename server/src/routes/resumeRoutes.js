import { Router } from "express";

import { createResumeController } from "../controllers/resumeController.js";
import { createResumeUpload } from "../middlewares/resumeUpload.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export function createResumeRouter({
  maxResumeSizeBytes,
  resumeService,
  resumeUploadDir,
  uploadRateLimit,
}) {
  const resumeRouter = Router();
  const resumeController = createResumeController({ resumeService });
  const uploadResume = createResumeUpload({
    maxResumeSizeBytes,
    resumeUploadDir,
  });

  resumeRouter.get("/", requireAuth, resumeController.listResumes);

  resumeRouter.post(
    "/",
    requireAuth,
    uploadRateLimit,
    uploadResume,
    resumeController.createResume,
  );

  return resumeRouter;
}
