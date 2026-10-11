import { Router } from "express";

import { createProjectController } from "../controllers/projectController.js";
import { createReadmeImportUpload } from "../middlewares/readmeImportUpload.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export function createProjectRouter({
  aiRateLimit,
  maxReadmeImportSizeBytes,
  projectService,
  readmeImportUploadDir,
  uploadRateLimit,
}) {
  const router = Router();
  const controller = createProjectController({ projectService });
  const uploadReadme = createReadmeImportUpload({
    maxReadmeImportSizeBytes,
    readmeImportUploadDir,
  });

  router.post("/extract", requireAuth, aiRateLimit, controller.extractDrafts);
  router.post(
    "/readme-draft",
    requireAuth,
    uploadRateLimit,
    uploadReadme,
    controller.importReadme,
  );
  router.post("/partial", requireAuth, controller.createPartialProject);
  router.post("/", requireAuth, controller.createProject);
  router.get("/", requireAuth, controller.listProjects);
  router.get("/:id", requireAuth, controller.getProject);
  router.patch("/:id", requireAuth, controller.updateProject);
  router.patch("/:id/partial", requireAuth, controller.updatePartialProject);
  router.delete("/:id", requireAuth, controller.deleteProject);

  return router;
}
