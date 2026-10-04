import mongoose from "mongoose";

import { AppError } from "../utils/AppError.js";

const idempotencyKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalid(fields, message = "Check the highlighted fields.") {
  throw new AppError("VALIDATION_ERROR", message, { fields, status: 400 });
}

function requestObject(body, allowedFields) {
  const request =
    body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const unexpected = Object.keys(request).filter(
    (key) => !allowedFields.has(key),
  );
  if (unexpected.length)
    invalid({ request: "Request contains unexpected fields." });
  return request;
}

function boundedText(
  value,
  field,
  minimum,
  maximum,
  { optional = false, nullable = false } = {},
) {
  if (nullable && value === null) return null;
  if (optional && value === undefined) return undefined;
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < minimum || text.length > maximum) {
    invalid({
      [field]: `${field} must be between ${minimum} and ${maximum} characters.`,
    });
  }
  return text;
}

function idempotencyKey(value) {
  const key = typeof value === "string" ? value.trim() : "";
  if (!idempotencyKeyPattern.test(key))
    invalid({ idempotencyKey: "Request identifier is invalid." });
  return key;
}

function targetInput(request, { patch = false } = {}) {
  const output = { idempotencyKey: idempotencyKey(request.idempotencyKey) };
  const fields = ["title", "company", "description"];
  if (patch && !fields.some((field) => Object.hasOwn(request, field))) {
    invalid({ request: "Provide at least one field to update." });
  }
  if (!patch || Object.hasOwn(request, "title"))
    output.title = boundedText(request.title, "title", 2, 120);
  if (Object.hasOwn(request, "company")) {
    output.company = boundedText(request.company, "company", 2, 120, {
      nullable: patch,
    });
  }
  if (!patch || Object.hasOwn(request, "description")) {
    output.description = boundedText(
      request.description,
      "description",
      100,
      12000,
    );
  }
  return output;
}

export function validateCreateJobTargetRequest(body) {
  return targetInput(
    requestObject(
      body,
      new Set(["idempotencyKey", "title", "company", "description"]),
    ),
  );
}

export function validatePatchJobTargetRequest(body) {
  return targetInput(
    requestObject(
      body,
      new Set(["idempotencyKey", "title", "company", "description"]),
    ),
    { patch: true },
  );
}

export function validateAnalyzeJobTargetRequest(body) {
  const request = requestObject(body, new Set(["idempotencyKey"]));
  return { idempotencyKey: idempotencyKey(request.idempotencyKey) };
}

export function validateJobTargetId(value) {
  if (!mongoose.isObjectIdOrHexString(value)) {
    invalid({}, "Job Target ID is invalid.");
  }
  return value;
}
