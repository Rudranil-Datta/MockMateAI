import { Router } from "express";

import { createCoachController } from "../controllers/coachController.js";
import { createCoachTreeController } from "../controllers/coachTreeController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export function createCoachRouter({
  coachKnowledgeTreeService,
  coachRateLimit,
  coachRoadmapService,
}) {
  const router = Router();
  const controller = createCoachController({ coachRoadmapService });
  const treeController = createCoachTreeController({
    coachKnowledgeTreeService,
  });
  router.get("/roadmap", requireAuth, coachRateLimit, controller.getRoadmap);
  router.get("/tree", requireAuth, coachRateLimit, treeController.getTree);
  return router;
}
