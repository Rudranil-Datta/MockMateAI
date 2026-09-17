import { Router } from "express";

import {
  getCurrentUser,
  login,
  logout,
  signup,
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, getCurrentUser);

export default authRouter;
