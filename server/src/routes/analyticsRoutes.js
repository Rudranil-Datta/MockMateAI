import { Router } from "express";

import { createAnalyticsController } from "../controllers/analyticsController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export function createAnalyticsRouter({ analyticsService }) {
  const analyticsRouter = Router();
  const analyticsController = createAnalyticsController({ analyticsService });

  analyticsRouter.get("/summary", requireAuth, analyticsController.getSummary);

  return analyticsRouter;
}
