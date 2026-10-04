import { Router } from "express";

import { createProjectController } from "../controllers/projectController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export function createProjectRouter({ aiRateLimit, projectService }) {
  const router = Router();
  const controller = createProjectController({ projectService });

  router.post("/extract", requireAuth, aiRateLimit, controller.extractDrafts);
  router.post("/", requireAuth, controller.createProject);
  router.get("/", requireAuth, controller.listProjects);
  router.get("/:id", requireAuth, controller.getProject);
  router.patch("/:id", requireAuth, controller.updateProject);
  router.delete("/:id", requireAuth, controller.deleteProject);

  return router;
}
