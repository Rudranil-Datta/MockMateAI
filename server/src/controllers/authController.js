import {
  authenticateUser,
  createUser,
  findUserById,
  toSafeUser,
} from "../services/authService.js";
import {
  authCookieName,
  createAuthToken,
  getAuthCookieOptions,
  getClearAuthCookieOptions,
} from "../services/authTokenService.js";
import { AppError } from "../utils/AppError.js";
import {
  validateLoginRequest,
  validateSignupRequest,
} from "../validators/authSchemas.js";

export async function signup(request, response, next) {
  try {
    const signupInput = validateSignupRequest(request.body);
    const user = await createUser(signupInput);

    response
      .cookie(authCookieName, createAuthToken(user.id), getAuthCookieOptions())
      .status(201)
      .json({ user: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function login(request, response, next) {
  try {
    const loginInput = validateLoginRequest(request.body);
    const user = await authenticateUser(loginInput);

    response
      .cookie(authCookieName, createAuthToken(user.id), getAuthCookieOptions())
      .status(200)
      .json({ user: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
}

export function logout(_request, response) {
  response
    .clearCookie(authCookieName, getClearAuthCookieOptions())
    .status(204)
    .send();
}

export async function getCurrentUser(request, response, next) {
  try {
    const user = await findUserById(request.auth.userId);

    if (!user) {
      throw new AppError("UNAUTHENTICATED", "Sign in to continue.", {
        status: 401,
      });
    }

    response.status(200).json({ user: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
}
