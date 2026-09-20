import bcrypt from "bcrypt";
import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app.js";
import User from "../../src/models/User.js";
import useMongoTestDatabase from "../helpers/useMongoTestDatabase.js";

const validSignup = {
  email: "asha.kumar@example.com",
  name: "Asha Kumar",
  password: "secure-password-123",
};
const oversizedEmail = `${"a".repeat(243)}@example.com`;

function getSessionCookie(response) {
  return response.headers["set-cookie"][0].split(";")[0];
}

useMongoTestDatabase();

describe("POST /api/auth/signup", () => {
  it("creates a user with a password hash and returns a safe user", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send(validSignup);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      user: {
        email: validSignup.email,
        id: expect.any(String),
        name: validSignup.name,
        profile: {},
      },
    });
    expect(response.body).not.toHaveProperty("user.passwordHash");
    expect(response.headers["set-cookie"][0]).toContain("mockmate_session=");
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");

    const storedUser = await User.findOne({ email: validSignup.email }).select(
      "+passwordHash",
    );
    expect(storedUser.passwordHash).not.toBe(validSignup.password);
    await expect(
      bcrypt.compare(validSignup.password, storedUser.passwordHash),
    ).resolves.toBe(true);
  });

  it("normalizes email before saving", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ ...validSignup, email: "  ASHA.KUMAR@EXAMPLE.COM " });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(validSignup.email);
  });

  it("establishes a session usable by current-user requests", async () => {
    const signupResponse = await request(app)
      .post("/api/auth/signup")
      .send(validSignup);

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", getSessionCookie(signupResponse));

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: validSignup.email,
      name: validSignup.name,
    });
  });

  it("rejects invalid signup input before persistence", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ email: "not-an-email", name: "", password: "short" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        fields: {
          email: "Enter a valid email address.",
          name: "Enter a name between 1 and 100 characters.",
          password: "Use a password between 12 and 72 bytes.",
        },
        message: "Check the highlighted fields.",
      },
    });
    await expect(User.countDocuments()).resolves.toBe(0);
  });

  it("rejects an oversized email before persistence", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ ...validSignup, email: oversizedEmail });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { email: "Enter a valid email address." },
    });
    expect(response.headers["set-cookie"]).toBeUndefined();
    await expect(User.countDocuments()).resolves.toBe(0);
  });

  it("rejects duplicate normalized email addresses safely", async () => {
    await request(app).post("/api/auth/signup").send(validSignup).expect(201);

    const response = await request(app)
      .post("/api/auth/signup")
      .send({ ...validSignup, email: "ASHA.KUMAR@EXAMPLE.COM" });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: "DUPLICATE_EMAIL",
        fields: { email: "Use a different email address." },
        message: "An account with this email already exists.",
      },
    });
  });
});
