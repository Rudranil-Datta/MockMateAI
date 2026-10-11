import bcrypt from "bcrypt";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

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

  it.each(["asha@example.in", "asha@example.org", "asha@example.co.uk"])(
    "accepts a valid signup email ending in %s",
    async (email) => {
      const response = await request(app)
        .post("/api/auth/signup")
        .send({ ...validSignup, email });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe(email);
    },
  );

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
          password: "Use a password between 15 and 72 bytes.",
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

  it.each([
    [
      "a too-short password",
      "abcde12345!xyz",
      "Use a password between 15 and 72 bytes.",
    ],
    [
      "a password without number or special character",
      "onlyletterslonger",
      "Include at least one number or special character.",
    ],
    [
      "a password with a control character",
      "longpassword123\n",
      "Password cannot contain control characters.",
    ],
    [
      "a password matching email",
      "asha.kumar@example.com",
      "Password must not match your name or email.",
    ],
    [
      "a password over 72 UTF-8 bytes",
      `${"é".repeat(36)}1!`,
      "Use a password between 15 and 72 bytes.",
    ],
  ])(
    "rejects %s before persistence",
    async (_description, password, message) => {
      const response = await request(app)
        .post("/api/auth/signup")
        .send({ ...validSignup, password });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatchObject({
        code: "VALIDATION_ERROR",
        fields: { password: message },
      });
      await expect(User.countDocuments()).resolves.toBe(0);
    },
  );

  it("rejects a password matching name before persistence", async () => {
    const name = "Asha-Kumar-123abc";
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ ...validSignup, name, password: name });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toEqual({
      password: "Password must not match your name or email.",
    });
    await expect(User.countDocuments()).resolves.toBe(0);
  });

  it.each(["longenoughpassword1", "longenoughpassword!"])(
    "accepts a password with %s",
    async (password) => {
      const response = await request(app)
        .post("/api/auth/signup")
        .send({ ...validSignup, password });

      expect(response.status).toBe(201);
    },
  );

  it("accepts a 72-byte UTF-8 password", async () => {
    const password = `${"é".repeat(35)}1!`;
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ ...validSignup, password });

    expect(response.status).toBe(201);
  });

  it.each([
    ".asha@example.com",
    "asha..kumar@example.com",
    "asha@example",
    "asha@example.c",
    "asha@-example.com",
    "asha@example-.com",
    "asha@example..com",
    "asha@example_domain.com",
    "asha@@example.com",
  ])("rejects malformed signup email %s before persistence", async (email) => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ ...validSignup, email });

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

  it("allows only one concurrent case-variant signup", async () => {
    const [firstResponse, secondResponse] = await Promise.all([
      request(app).post("/api/auth/signup").send(validSignup),
      request(app)
        .post("/api/auth/signup")
        .send({ ...validSignup, email: "ASHA.KUMAR@EXAMPLE.COM" }),
    ]);

    expect([firstResponse.status, secondResponse.status].sort()).toEqual([
      201, 409,
    ]);
    await expect(
      User.countDocuments({ email: validSignup.email }),
    ).resolves.toBe(1);
  });

  it("maps signup persistence failure safely without setting a session", async () => {
    const privateFailure = new Error("Private database signup detail");
    const createUser = vi
      .spyOn(User, "create")
      .mockRejectedValue(privateFailure);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await request(app)
        .post("/api/auth/signup")
        .send(validSignup);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong. Please try again later.",
        },
      });
      expect(response.headers["set-cookie"]).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain(
        privateFailure.message,
      );
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
        privateFailure.message,
      );
      expect(createUser).toHaveBeenCalledOnce();
      await expect(User.countDocuments()).resolves.toBe(0);
    } finally {
      createUser.mockRestore();
      errorLog.mockRestore();
    }
  });
});
