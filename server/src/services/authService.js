import bcrypt from "bcrypt";

import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { getPasswordPolicyError } from "../validators/authSchemas.js";

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

function createUnauthenticatedError() {
  return new AppError("UNAUTHENTICATED", "Sign in to continue.", {
    status: 401,
  });
}

export async function updateUserProfile({ name, profile, userId }) {
  const user = await User.findById(userId);

  if (!user) {
    throw createUnauthenticatedError();
  }

  user.name = name;
  if (profile) {
    user.profile = {
      ...user.profile?.toObject(),
      ...profile,
    };
  }
  await user.save();

  return user;
}

export async function changeUserPassword({
  currentPassword,
  newPassword,
  userId,
}) {
  const user = await User.findById(userId).select("+passwordHash");

  if (!user) {
    throw createUnauthenticatedError();
  }

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Current password is incorrect.",
      {
        status: 401,
      },
    );
  }

  const passwordError = getPasswordPolicyError({
    email: user.email,
    name: user.name,
    password: newPassword,
  });
  if (passwordError) {
    throw new AppError("VALIDATION_ERROR", "Check the highlighted fields.", {
      fields: { newPassword: passwordError },
      status: 400,
    });
  }

  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw new AppError("VALIDATION_ERROR", "Check the highlighted fields.", {
      fields: { newPassword: "Choose a password you have not used before." },
      status: 400,
    });
  }

  user.passwordHash = await bcrypt.hash(newPassword, passwordHashRounds);
  await user.save();

  return user;
}

export function toSafeUser(user) {
  return {
    email: user.email,
    id: user.id,
    name: user.name,
    profile: user.profile ?? {},
  };
}
