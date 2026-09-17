import { verifyAuthToken } from "../services/authTokenService.js";
import { AppError } from "../utils/AppError.js";

export function requireAuth(request, _response, next) {
  const token = request.cookies?.mockmate_session;
  const payload = token ? verifyAuthToken(token) : undefined;

  if (!payload?.sub || typeof payload.sub !== "string") {
    next(
      new AppError("UNAUTHENTICATED", "Sign in to continue.", {
        status: 401,
      }),
    );
    return;
  }

  request.auth = { userId: payload.sub };
  next();
}
