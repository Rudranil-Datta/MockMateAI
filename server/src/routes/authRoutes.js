import { Router } from "express";

import {
  getCurrentUser,
  login,
  logout,
  signup,
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export function createAuthRouter({ authRateLimit }) {
  const authRouter = Router();

  authRouter.post("/signup", authRateLimit, signup);
  authRouter.post("/login", authRateLimit, login);
  authRouter.post("/logout", logout);
  authRouter.get("/me", requireAuth, getCurrentUser);

  return authRouter;
}
