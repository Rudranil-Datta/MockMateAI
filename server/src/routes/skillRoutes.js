import { Router } from "express";

import { createSkillController } from "../controllers/skillController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export function createSkillRouter({ skillEvidenceService }) {
  const router = Router();
  const controller = createSkillController({ skillEvidenceService });
  router.get("/profile", requireAuth, controller.getProfile);
  return router;
}
