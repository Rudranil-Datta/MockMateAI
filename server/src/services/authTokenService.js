import jwt from "jsonwebtoken";

export const authCookieName = "mockmate_session";
export const authTokenAudience = "mockmateai-client";
export const authTokenIssuer = "mockmateai-api";

const authTokenExpiresIn = "8h";
const authTokenMaxAgeMs = 8 * 60 * 60 * 1000;

function getAuthSecret() {
  const authSecret = process.env.AUTH_SECRET?.trim();

  if (!authSecret) {
    throw new Error("Authentication configuration is unavailable.");
  }

  return authSecret;
}

export function createAuthToken(userId) {
  return jwt.sign({ sub: userId }, getAuthSecret(), {
    audience: authTokenAudience,
    expiresIn: authTokenExpiresIn,
    issuer: authTokenIssuer,
  });
}

export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, getAuthSecret(), {
      audience: authTokenAudience,
      issuer: authTokenIssuer,
    });
  } catch {
    return undefined;
  }
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    maxAge: authTokenMaxAgeMs,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

export function getClearAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}
