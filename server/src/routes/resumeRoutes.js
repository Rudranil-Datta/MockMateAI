import { Router } from "express";

import { createResumeController } from "../controllers/resumeController.js";
import { createResumeUpload } from "../middlewares/resumeUpload.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export function createResumeRouter({ maxResumeSizeBytes, resumeUploadDir }) {
  const resumeRouter = Router();
  const resumeController = createResumeController();
  const uploadResume = createResumeUpload({
    maxResumeSizeBytes,
    resumeUploadDir,
  });

  resumeRouter.post(
    "/",
    requireAuth,
    uploadResume,
    resumeController.createResume,
  );

  return resumeRouter;
}
