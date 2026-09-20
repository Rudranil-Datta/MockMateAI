import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import User from "../../src/models/User.js";

function validUser(overrides = {}) {
  return {
    email: "asha@example.com",
    name: "Asha Kumar",
    passwordHash: "stored-password-hash",
    ...overrides,
  };
}

describe("User", () => {
  it("enforces the persisted email length bound", async () => {
    const maximumEmail = `${"a".repeat(242)}@example.com`;
    const oversizedEmail = `${"a".repeat(243)}@example.com`;

    expect(maximumEmail).toHaveLength(254);
    expect(oversizedEmail).toHaveLength(255);
    await expect(
      new User(validUser({ email: maximumEmail })).validate(),
    ).resolves.toBeUndefined();
    await expect(
      new User(validUser({ email: oversizedEmail })).validate(),
    ).rejects.toThrow();
  });

  it("keeps the password hash excluded by default", () => {
    expect(User.schema.path("passwordHash").options.select).toBe(false);
    expect(User.schema.path("userId")).toBeUndefined();
    expect(mongoose.isValidObjectId(new User(validUser()).id)).toBe(true);
  });
});
