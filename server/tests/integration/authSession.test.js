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
const oversizedEmail = `${"a".repeat(243)}@example.com`;

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

  it("rejects malformed login input without setting a session", async () => {
    const missingPasswordResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: validCredentials.email });
    const oversizedEmailResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: oversizedEmail, password: validCredentials.password });

    for (const response of [missingPasswordResponse, oversizedEmailResponse]) {
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.headers["set-cookie"]).toBeUndefined();
    }
    expect(missingPasswordResponse.body.error.fields).toEqual({
      password: "Enter your password.",
    });
    expect(oversizedEmailResponse.body.error.fields).toEqual({
      email: "Enter a valid email address.",
    });
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

  it("updates only signed-in user's allow-listed profile fields", async () => {
    const signedInUser = await createUser();
    const otherUser = await createUser({
      email: "other.user@example.com",
      name: "Other User",
    });
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send(validCredentials);

    const response = await request(app)
      .patch("/api/auth/profile")
      .set("Cookie", getSessionCookie(loginResponse))
      .send({
        name: "Asha Updated",
        profile: {
          experienceLevel: "advanced",
          targetRole: "Platform Engineer",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        email: validCredentials.email,
        id: signedInUser.id,
        name: "Asha Updated",
        profile: {
          experienceLevel: "advanced",
          targetRole: "Platform Engineer",
        },
      },
    });
    expect(response.body).not.toHaveProperty("user.passwordHash");
    await expect(User.findById(signedInUser.id)).resolves.toMatchObject({
      name: "Asha Updated",
      profile: {
        experienceLevel: "advanced",
        targetRole: "Platform Engineer",
      },
    });
    await expect(User.findById(otherUser.id)).resolves.toMatchObject({
      name: "Other User",
    });
  });

  it("rejects invalid or unauthenticated profile updates without mutation", async () => {
    const user = await createUser();
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send(validCredentials);

    const invalidResponse = await request(app)
      .patch("/api/auth/profile")
      .set("Cookie", getSessionCookie(loginResponse))
      .send({
        name: "Asha Kumar",
        profile: { experienceLevel: "expert", isAdmin: true },
        userId: new mongoose.Types.ObjectId().toString(),
      });
    const unauthenticatedResponse = await request(app)
      .patch("/api/auth/profile")
      .send({ name: "Another Name" });

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: {
        experienceLevel: "Choose a supported experience level.",
        profile: "Enter valid profile details.",
      },
    });
    expect(unauthenticatedResponse.status).toBe(401);
    await expect(User.findById(user.id)).resolves.toMatchObject({
      name: "Asha Kumar",
      profile: {},
    });
  });

  it("changes password only after current-password proof and refreshes cookie", async () => {
    const user = await createUser();
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send(validCredentials);
    const newPassword = "new-secure-password-456";

    const response = await request(app)
      .patch("/api/auth/password")
      .set("Cookie", getSessionCookie(loginResponse))
      .send({
        confirmation: newPassword,
        currentPassword: validCredentials.password,
        newPassword,
      });

    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"][0]).toContain(`${authCookieName}=`);
    expect(response.body).not.toHaveProperty("user.passwordHash");
    const storedUser = await User.findById(user.id).select("+passwordHash");
    await expect(
      bcrypt.compare(newPassword, storedUser.passwordHash),
    ).resolves.toBe(true);
    await expect(
      bcrypt.compare(validCredentials.password, storedUser.passwordHash),
    ).resolves.toBe(false);
    await request(app)
      .post("/api/auth/login")
      .send(validCredentials)
      .expect(401);
    await request(app)
      .post("/api/auth/login")
      .send({ ...validCredentials, password: newPassword })
      .expect(200);
  });

  it("preserves password when proof, policy, reuse, or confirmation fails", async () => {
    const user = await createUser();
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send(validCredentials);
    const cookie = getSessionCookie(loginResponse);
    const requests = [
      {
        confirmation: "new-secure-password-456",
        currentPassword: "wrong-password-123",
        newPassword: "new-secure-password-456",
      },
      {
        confirmation: validCredentials.password,
        currentPassword: validCredentials.password,
        newPassword: validCredentials.password,
      },
      {
        confirmation: "onlyletterslonger",
        currentPassword: validCredentials.password,
        newPassword: "onlyletterslonger",
      },
      {
        confirmation: "mismatch",
        currentPassword: validCredentials.password,
        newPassword: "new-secure-password-456",
      },
    ];

    const responses = await Promise.all(
      requests.map((body) =>
        request(app)
          .patch("/api/auth/password")
          .set("Cookie", cookie)
          .send(body),
      ),
    );

    expect(responses.map((response) => response.status)).toEqual([
      401, 400, 400, 400,
    ]);
    expect(responses[0].body.error.code).toBe("INVALID_CREDENTIALS");
    expect(
      responses
        .slice(1)
        .every((response) => response.body.error.code === "VALIDATION_ERROR"),
    ).toBe(true);
    expect(responses.every((response) => !response.headers["set-cookie"])).toBe(
      true,
    );
    const storedUser = await User.findById(user.id).select("+passwordHash");
    await expect(
      bcrypt.compare(validCredentials.password, storedUser.passwordHash),
    ).resolves.toBe(true);
  });

  it("rejects unauthenticated password changes", async () => {
    const response = await request(app).patch("/api/auth/password").send({
      confirmation: "new-secure-password-456",
      currentPassword: validCredentials.password,
      newPassword: "new-secure-password-456",
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
});
