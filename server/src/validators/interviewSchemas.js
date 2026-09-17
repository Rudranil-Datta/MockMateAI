import mongoose from "mongoose";

import { AppError } from "../utils/AppError.js";
import { interviewLevels, interviewTypes } from "./aiSchemas.js";

const maxTextAnswerLength = 10000;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateStartInterviewRequest(body) {
  const request = body && typeof body === "object" ? body : {};
  const interviewType = normalizeString(request.interviewType);
  const level = normalizeString(request.level);
  const fields = {};

  if (!interviewTypes.includes(interviewType)) {
    fields.interviewType = "Choose DSA, HR, or System Design.";
  }

  if (!interviewLevels.includes(level)) {
    fields.level = "Choose beginner, intermediate, or advanced.";
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
    interviewType,
    level,
    ...(request.resumeId ? { resumeId: request.resumeId } : {}),
  };
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
  const questionId = normalizeString(request.questionId);
  const text = normalizeString(request.text);
  const fields = {};

  if (!mongoose.isObjectIdOrHexString(questionId)) {
    fields.questionId = "Question ID is invalid.";
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

  return { questionId, text };
}
