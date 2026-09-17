import { AppError } from "../utils/AppError.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maximumPasswordBytes = 72;
const minimumPasswordLength = 12;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateSignupRequest(body) {
  const request = body && typeof body === "object" ? body : {};
  const name = normalizeString(request.name);
  const email = normalizeString(request.email).toLowerCase();
  const password = typeof request.password === "string" ? request.password : "";
  const fields = {};

  if (!name || name.length > 100) {
    fields.name = "Enter a name between 1 and 100 characters.";
  }

  if (!emailPattern.test(email)) {
    fields.email = "Enter a valid email address.";
  }

  if (
    password.length < minimumPasswordLength ||
    Buffer.byteLength(password, "utf8") > maximumPasswordBytes
  ) {
    fields.password = "Use a password between 12 and 72 bytes.";
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError("VALIDATION_ERROR", "Check the highlighted fields.", {
      fields,
      status: 400,
    });
  }

  return { email, name, password };
}

export function validateLoginRequest(body) {
  const request = body && typeof body === "object" ? body : {};
  const email = normalizeString(request.email).toLowerCase();
  const password = typeof request.password === "string" ? request.password : "";
  const fields = {};

  if (!emailPattern.test(email)) {
    fields.email = "Enter a valid email address.";
  }

  if (!password || Buffer.byteLength(password, "utf8") > maximumPasswordBytes) {
    fields.password = "Enter your password.";
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError("VALIDATION_ERROR", "Check the highlighted fields.", {
      fields,
      status: 400,
    });
  }

  return { email, password };
}
