import mongoose from "mongoose";

import { AppError } from "../utils/AppError.js";
import { interviewLevels, interviewTypes } from "./aiSchemas.js";

const maxTextAnswerLength = 10000;
const idempotencyKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateStartInterviewRequest(body) {
  const request = body && typeof body === "object" ? body : {};
  const interviewType = normalizeString(request.interviewType);
  const level = normalizeString(request.level);
  const idempotencyKey = normalizeString(request.idempotencyKey);
  const fields = {};

  if (!interviewTypes.includes(interviewType)) {
    fields.interviewType = "Choose DSA, HR, or System Design.";
  }

  if (!interviewLevels.includes(level)) {
    fields.level = "Choose beginner, intermediate, or advanced.";
  }

  if (!idempotencyKeyPattern.test(idempotencyKey)) {
    fields.idempotencyKey = "Request identifier is invalid.";
  }

  if (
    request.resumeId !== undefined &&
    (!normalizeString(request.resumeId) ||
      !mongoose.isObjectIdOrHexString(request.resumeId))
  ) {
    fields.resumeId = "Choose a valid resume.";
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError("VALIDATION_ERROR", "Check the highlighted fields.", {
      fields,
      status: 400,
    });
  }

  return {
    idempotencyKey,
    interviewType,
    level,
    ...(request.resumeId ? { resumeId: request.resumeId } : {}),
  };
}

export function validateQuestionGenerationRequest(body) {
  const idempotencyKey = normalizeString(body?.idempotencyKey);

  if (!idempotencyKeyPattern.test(idempotencyKey)) {
    throw new AppError("VALIDATION_ERROR", "Check the highlighted fields.", {
      fields: { idempotencyKey: "Request identifier is invalid." },
      status: 400,
    });
  }

  return { idempotencyKey };
}

export function validateInterviewId(value) {
  if (!mongoose.isObjectIdOrHexString(value)) {
    throw new AppError("VALIDATION_ERROR", "Interview ID is invalid.", {
      status: 400,
    });
  }

  return value;
}

export function validateTextAnswerRequest(body) {
  const request = body && typeof body === "object" ? body : {};
  const idempotencyKey = normalizeString(request.idempotencyKey);
  const questionId = normalizeString(request.questionId);
  const text = normalizeString(request.text);
  const fields = {};

  if (!mongoose.isObjectIdOrHexString(questionId)) {
    fields.questionId = "Question ID is invalid.";
  }

  if (!idempotencyKeyPattern.test(idempotencyKey)) {
    fields.idempotencyKey = "Request identifier is invalid.";
  }

  if (!text) {
    fields.text = "Enter an answer before saving.";
  } else if (text.length > maxTextAnswerLength) {
    fields.text = `Answer must be at most ${maxTextAnswerLength} characters.`;
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError("VALIDATION_ERROR", "Check the highlighted fields.", {
      fields,
      status: 400,
    });
  }

  return { idempotencyKey, questionId, text };
}
