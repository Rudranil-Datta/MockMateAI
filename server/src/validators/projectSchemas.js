import mongoose from "mongoose";

import { AppError } from "../utils/AppError.js";

const idempotencyKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxProjectFactsBytes = 16 * 1024;
const editableFields = [
  "name",
  "summary",
  "role",
  "technologies",
  "responsibilities",
  "architecture",
  "decisions",
  "tradeoffs",
  "claims",
];

function invalid(
  fields,
  message = "Check the highlighted fields.",
  code = "VALIDATION_ERROR",
) {
  throw new AppError(code, message, { fields, status: 400 });
}

function exactRequest(body, allowedFields) {
  const request =
    body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const unexpected = Object.keys(request).filter(
    (key) => !allowedFields.includes(key),
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
  { nullable = false } = {},
) {
  if (nullable && value === null) return null;
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < minimum || text.length > maximum) {
    invalid({
      [field]: `${field} must be between ${minimum} and ${maximum} characters.`,
    });
  }
  return text;
}

function textList(value, field, minimum, maximum, itemMinimum, itemMaximum) {
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum
  ) {
    invalid({
      [field]: `${field} must contain between ${minimum} and ${maximum} items.`,
    });
  }
  const items = value.map((item, index) =>
    boundedText(item, `${field}.${index}`, itemMinimum, itemMaximum),
  );
  if (new Set(items.map((item) => item.toLowerCase())).size !== items.length) {
    invalid({ [field]: `${field} cannot contain duplicates.` });
  }
  return items;
}

function claims(value) {
  if (!Array.isArray(value) || value.length > 8) {
    invalid({ claims: "claims must contain between 0 and 8 items." });
  }
  const items = value.map((claim, index) => {
    const item = exactRequest(claim, ["text", "evidence"]);
    return {
      text: boundedText(item.text, `claims.${index}.text`, 20, 600),
      evidence: boundedText(
        item.evidence,
        `claims.${index}.evidence`,
        20,
        600,
        {
          nullable: true,
        },
      ),
    };
  });
  if (
    new Set(items.map(({ text }) => text.toLowerCase())).size !== items.length
  ) {
    invalid({ claims: "claims cannot contain duplicate text." });
  }
  return items;
}

export function validateProjectFacts(input) {
  const request = exactRequest(input, editableFields);
  const facts = {
    name: boundedText(request.name, "name", 2, 120),
    summary: boundedText(request.summary, "summary", 20, 1000),
    role: boundedText(request.role, "role", 2, 120),
    technologies: textList(request.technologies, "technologies", 1, 15, 1, 50),
    responsibilities: textList(
      request.responsibilities,
      "responsibilities",
      1,
      10,
      20,
      600,
    ),
    architecture: textList(
      request.architecture,
      "architecture",
      1,
      10,
      20,
      600,
    ),
    decisions: textList(request.decisions, "decisions", 0, 8, 20, 600),
    tradeoffs: textList(request.tradeoffs, "tradeoffs", 0, 8, 20, 600),
    claims: claims(request.claims),
  };
  if (Buffer.byteLength(JSON.stringify(facts), "utf8") > maxProjectFactsBytes) {
    invalid({ request: "Confirmed project facts exceed the allowed size." });
  }
  return facts;
}

export function validateExtractProjectsRequest(body) {
  const request = exactRequest(body, ["idempotencyKey", "resumeId"]);
  const idempotencyKey =
    typeof request.idempotencyKey === "string"
      ? request.idempotencyKey.trim()
      : "";
  if (!idempotencyKeyPattern.test(idempotencyKey)) {
    invalid({ idempotencyKey: "Request identifier is invalid." });
  }
  if (!mongoose.isObjectIdOrHexString(request.resumeId)) {
    invalid({ resumeId: "Resume ID is invalid." });
  }
  return { idempotencyKey, resumeId: request.resumeId };
}

export function validateProjectWriteRequest(body) {
  const request = exactRequest(body, [
    ...editableFields,
    "sourceResumeId",
    "confirmed",
  ]);
  if (request.confirmed !== true) {
    invalid(
      { confirmed: "Review and confirm all project facts before saving." },
      "Review and confirm all project facts before saving.",
      "PROJECT_CONFIRMATION_REQUIRED",
    );
  }
  let sourceResumeId;
  if (request.sourceResumeId !== undefined && request.sourceResumeId !== null) {
    if (!mongoose.isObjectIdOrHexString(request.sourceResumeId)) {
      invalid({ sourceResumeId: "Resume ID is invalid." });
    }
    sourceResumeId = request.sourceResumeId;
  }
  const factInput = Object.fromEntries(
    editableFields.map((field) => [field, request[field]]),
  );
  return {
    ...validateProjectFacts(factInput),
    ...(sourceResumeId ? { sourceResumeId } : {}),
  };
}

export function validatePartialProjectWriteRequest(body) {
  const request = exactRequest(body, [
    ...editableFields,
    "partialConfirmed",
    "sourceResumeId",
  ]);
  if (request.partialConfirmed !== true) {
    invalid(
      {
        partialConfirmed:
          "Review and confirm this incomplete project before saving.",
      },
      "Review and confirm this incomplete project before saving.",
      "PROJECT_CONFIRMATION_REQUIRED",
    );
  }
  let sourceResumeId;
  if (request.sourceResumeId !== undefined && request.sourceResumeId !== null) {
    if (!mongoose.isObjectIdOrHexString(request.sourceResumeId))
      invalid({ sourceResumeId: "Resume ID is invalid." });
    sourceResumeId = request.sourceResumeId;
  }
  const optionalText = (value, field, minimum, maximum) => {
    if (value === null) return null;
    return boundedText(value, field, minimum, maximum);
  };
  const optionalList = (value, field, maximum, itemMinimum, itemMaximum) =>
    textList(value, field, 0, maximum, itemMinimum, itemMaximum);
  const facts = {
    name: optionalText(request.name, "name", 2, 120),
    summary: optionalText(request.summary, "summary", 5, 1000),
    role: optionalText(request.role, "role", 2, 120),
    technologies: optionalList(request.technologies, "technologies", 15, 1, 50),
    responsibilities: optionalList(
      request.responsibilities,
      "responsibilities",
      10,
      20,
      600,
    ),
    architecture: optionalList(
      request.architecture,
      "architecture",
      10,
      20,
      600,
    ),
    decisions: optionalList(request.decisions, "decisions", 8, 20, 600),
    tradeoffs: optionalList(request.tradeoffs, "tradeoffs", 8, 20, 600),
    claims: claims(request.claims),
  };
  if (
    !facts.name &&
    !facts.summary &&
    !facts.technologies.length &&
    !facts.responsibilities.length &&
    !facts.architecture.length &&
    !facts.decisions.length &&
    !facts.tradeoffs.length &&
    !facts.claims.length
  )
    invalid({ request: "Incomplete project must contain at least one fact." });
  if (Buffer.byteLength(JSON.stringify(facts), "utf8") > maxProjectFactsBytes)
    invalid({ request: "Project facts exceed the allowed size." });
  return { ...facts, ...(sourceResumeId ? { sourceResumeId } : {}) };
}

export function validateProjectId(value) {
  if (!mongoose.isObjectIdOrHexString(value))
    invalid({}, "Project ID is invalid.");
  return value;
}
