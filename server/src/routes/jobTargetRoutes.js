import { Router } from "express";

import { createJobTargetController } from "../controllers/jobTargetController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export function createJobTargetRouter({ aiRateLimit, jobTargetService }) {
  const router = Router();
  const controller = createJobTargetController({ jobTargetService });

  router.post("/", requireAuth, aiRateLimit, controller.createTarget);
  router.get("/", requireAuth, controller.listTargets);
  router.get("/:id", requireAuth, controller.getTarget);
  router.patch("/:id", requireAuth, aiRateLimit, controller.updateTarget);
  router.post(
    "/:id/analyze",
    requireAuth,
    aiRateLimit,
    controller.analyzeTarget,
  );
  router.delete("/:id", requireAuth, controller.deleteTarget);

  return router;
}
