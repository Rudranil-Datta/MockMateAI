import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app.js";
import User from "../../src/models/User.js";
import {
  authCookieName,
  authTokenAudience,
  authTokenIssuer,
} from "../../src/services/authTokenService.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

const validCredentials = {
  email: "asha.kumar@example.com",
  password: "secure-password-123",
};

useMongoTestDatabase();

async function createUser({ email, name } = {}) {
  return User.create({
    email: email || validCredentials.email,
    name: name || "Asha Kumar",
    passwordHash: await bcrypt.hash(validCredentials.password, 12),
  });
}

function getSessionCookie(response) {
  return response.headers["set-cookie"][0].split(";")[0];
}

describe("authentication session routes", () => {
  it("logs in with an HttpOnly session cookie and returns a safe user", async () => {
    await createUser();

    const response = await request(app)
      .post("/api/auth/login")
      .send(validCredentials);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        email: validCredentials.email,
        id: expect.any(String),
        name: "Asha Kumar",
        profile: {},
      },
    });
    expect(response.headers["set-cookie"][0]).toContain(`${authCookieName}=`);
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"][0]).toContain("SameSite=Lax");
  });

  it("returns current user for a valid session", async () => {
    await createUser();
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send(validCredentials);

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", getSessionCookie(loginResponse));

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: validCredentials.email,
      name: "Asha Kumar",
    });
    expect(response.body).not.toHaveProperty("user.passwordHash");
  });

  it("uses session identity instead of a user-controlled query value", async () => {
    const signedInUser = await createUser();
    const otherUser = await createUser({
      email: "other.user@example.com",
      name: "Other User",
    });
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send(validCredentials);

    const response = await request(app)
      .get("/api/auth/me")
      .query({ userId: otherUser.id })
      .set("Cookie", getSessionCookie(loginResponse));

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(signedInUser.id);
    expect(response.body.user.id).not.toBe(otherUser.id);
  });

  it("rejects a session after its user has been deleted", async () => {
    const user = await createUser();
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send(validCredentials);
    await User.deleteOne({ _id: user.id });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", getSessionCookie(loginResponse));

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Sign in to continue.",
      },
    });
  });

  it("rejects invalid credentials without setting a session", async () => {
    await createUser();

    const response = await request(app)
      .post("/api/auth/login")
      .send({ ...validCredentials, password: "wrong-password-123" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      },
    });
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects missing, invalid, and expired sessions safely", async () => {
    const missingResponse = await request(app).get("/api/auth/me");
    const invalidResponse = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${authCookieName}=invalid-token`);
    const expiredToken = jwt.sign(
      { sub: new mongoose.Types.ObjectId().toString() },
      process.env.AUTH_SECRET,
      {
        audience: authTokenAudience,
        expiresIn: "-1s",
        issuer: authTokenIssuer,
      },
    );
    const expiredResponse = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${authCookieName}=${expiredToken}`);

    for (const response of [
      missingResponse,
      invalidResponse,
      expiredResponse,
    ]) {
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: {
          code: "UNAUTHENTICATED",
          message: "Sign in to continue.",
        },
      });
    }
  });

  it("clears the session cookie on logout", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(204);
    expect(response.headers["set-cookie"][0]).toContain(`${authCookieName}=;`);
    expect(response.headers["set-cookie"][0]).toContain(
      "Expires=Thu, 01 Jan 1970",
    );
  });
});
