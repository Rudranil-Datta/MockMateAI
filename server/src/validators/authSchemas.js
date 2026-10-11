import { AppError } from "../utils/AppError.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailLocalPartPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const emailDomainLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const emailTopLevelDomainPattern = /^[a-z]{2,63}$/i;
const maximumEmailLength = 254;
const maximumPasswordBytes = 72;
const minimumPasswordBytes = 15;
const passwordDigitOrSpecialCharacterPattern = /[\p{N}\p{P}\p{S}]/u;
const passwordControlCharacterPattern = /[\p{Cc}\p{Cf}]/u;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hasValidSignupEmailSyntax(email) {
  const separatorIndex = email.indexOf("@");

  if (separatorIndex <= 0 || separatorIndex !== email.lastIndexOf("@")) {
    return false;
  }

  const localPart = email.slice(0, separatorIndex);
  const domain = email.slice(separatorIndex + 1);
  const domainLabels = domain.split(".");

  return (
    !localPart.startsWith(".") &&
    !localPart.endsWith(".") &&
    !localPart.includes("..") &&
    emailLocalPartPattern.test(localPart) &&
    domainLabels.length >= 2 &&
    domainLabels.every((label) => emailDomainLabelPattern.test(label)) &&
    emailTopLevelDomainPattern.test(domainLabels.at(-1))
  );
}

export function getPasswordPolicyError({ email = "", name = "", password }) {
  const passwordBytes = Buffer.byteLength(password, "utf8");

  if (
    passwordBytes < minimumPasswordBytes ||
    passwordBytes > maximumPasswordBytes
  ) {
    return "Use a password between 15 and 72 bytes.";
  }

  if (passwordControlCharacterPattern.test(password)) {
    return "Password cannot contain control characters.";
  }

  if (!passwordDigitOrSpecialCharacterPattern.test(password)) {
    return "Include at least one number or special character.";
  }

  const normalizedPassword = password.toLowerCase();
  if (
    (email && normalizedPassword === email.toLowerCase()) ||
    (name && normalizedPassword === name.toLowerCase())
  ) {
    return "Password must not match your name or email.";
  }

  return "";
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

  if (email.length > maximumEmailLength || !hasValidSignupEmailSyntax(email)) {
    fields.email = "Enter a valid email address.";
  }

  const passwordError = getPasswordPolicyError({ email, name, password });
  if (passwordError) {
    fields.password = passwordError;
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError("VALIDATION_ERROR", "Check the highlighted fields.", {
      fields,
      status: 400,
    });
  }

  return { email, name, password };
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

export function validateProfileUpdateRequest(body) {
  const request = isPlainObject(body) ? body : {};
  const fields = {};
  const hasUnsupportedRootField = Object.keys(request).some(
    (key) => !["name", "profile"].includes(key),
  );
  const name = normalizeString(request.name);

  if (!name || name.length > 100) {
    fields.name = "Enter a name between 1 and 100 characters.";
  }

  let profile;
  if (request.profile !== undefined) {
    if (!isPlainObject(request.profile)) {
      fields.profile = "Enter valid profile details.";
    } else {
      const hasUnsupportedProfileField = Object.keys(request.profile).some(
        (key) => !["experienceLevel", "targetRole"].includes(key),
      );
      const profileUpdate = {};

      if (hasUnsupportedProfileField) {
        fields.profile = "Enter valid profile details.";
      }
      if (Object.hasOwn(request.profile, "targetRole")) {
        const targetRole = normalizeString(request.profile.targetRole);
        if (
          typeof request.profile.targetRole !== "string" ||
          targetRole.length > 100
        ) {
          fields.targetRole = "Enter a target role of up to 100 characters.";
        } else {
          profileUpdate.targetRole = targetRole || undefined;
        }
      }
      if (Object.hasOwn(request.profile, "experienceLevel")) {
        const experienceLevel = normalizeString(
          request.profile.experienceLevel,
        );
        if (
          experienceLevel &&
          !["beginner", "intermediate", "advanced"].includes(experienceLevel)
        ) {
          fields.experienceLevel = "Choose a supported experience level.";
        } else {
          profileUpdate.experienceLevel = experienceLevel || undefined;
        }
      }
      profile = profileUpdate;
    }
  }

  if (hasUnsupportedRootField) {
    fields.profile = "Enter valid profile details.";
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError("VALIDATION_ERROR", "Check the highlighted fields.", {
      fields,
      status: 400,
    });
  }

  return { name, profile };
}

export function validatePasswordChangeRequest(body) {
  const request = isPlainObject(body) ? body : {};
  const currentPassword =
    typeof request.currentPassword === "string" ? request.currentPassword : "";
  const newPassword =
    typeof request.newPassword === "string" ? request.newPassword : "";
  const confirmation =
    typeof request.confirmation === "string" ? request.confirmation : "";
  const fields = {};

  if (
    !currentPassword ||
    Buffer.byteLength(currentPassword, "utf8") > maximumPasswordBytes
  ) {
    fields.currentPassword = "Enter your current password.";
  }

  const passwordError = getPasswordPolicyError({ password: newPassword });
  if (passwordError) {
    fields.newPassword = passwordError;
  }

  if (confirmation !== newPassword) {
    fields.confirmation = "Passwords do not match.";
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError("VALIDATION_ERROR", "Check the highlighted fields.", {
      fields,
      status: 400,
    });
  }

  return { currentPassword, newPassword };
}

export function validateLoginRequest(body) {
  const request = body && typeof body === "object" ? body : {};
  const email = normalizeString(request.email).toLowerCase();
  const password = typeof request.password === "string" ? request.password : "";
  const fields = {};

  if (email.length > maximumEmailLength || !emailPattern.test(email)) {
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
