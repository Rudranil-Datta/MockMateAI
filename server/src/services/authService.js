import bcrypt from "bcrypt";

import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";

const passwordHashRounds = 12;

export async function createUser({ email, name, password }) {
  const passwordHash = await bcrypt.hash(password, passwordHashRounds);

  try {
    return await User.create({ email, name, passwordHash });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(
        "DUPLICATE_EMAIL",
        "An account with this email already exists.",
        {
          fields: { email: "Use a different email address." },
          status: 409,
        },
      );
    }

    throw error;
  }
}

export async function authenticateUser({ email, password }) {
  const user = await User.findOne({ email }).select("+passwordHash");
  const isPasswordValid =
    user && (await bcrypt.compare(password, user.passwordHash));

  if (!isPasswordValid) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
      {
        status: 401,
      },
    );
  }

  return user;
}

export async function findUserById(userId) {
  return User.findById(userId);
}

export function toSafeUser(user) {
  return {
    email: user.email,
    id: user.id,
    name: user.name,
    profile: user.profile ?? {},
  };
}
