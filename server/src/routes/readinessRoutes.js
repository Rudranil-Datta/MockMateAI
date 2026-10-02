import { Router } from "express";

export function createReadinessRouter({ checkReadiness, timeoutMs }) {
  const readinessRouter = Router();

  readinessRouter.get("/", async (_request, response) => {
    const isReady = await checkReadiness({ timeoutMs });
    response.status(isReady ? 200 : 503).json({
      status: isReady ? "ready" : "unavailable",
    });
  });

  return readinessRouter;
}
