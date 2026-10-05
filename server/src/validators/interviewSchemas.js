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
  const allowedFields = new Set([
    "idempotencyKey",
    "interviewType",
    "jobTargetId",
    "level",
    "projectId",
    "resumeId",
    "sessionPurpose",
    "focusSkillKey",
  ]);
  const interviewType = normalizeString(request.interviewType);
  const level = normalizeString(request.level);
  const idempotencyKey = normalizeString(request.idempotencyKey);
  const fields = {};

  if (
    ![...interviewTypes, "Role Simulation", "Project Defense"].includes(
      interviewType,
    )
  ) {
    fields.interviewType =
      "Choose DSA, HR, System Design, Role Simulation, or Project Defense.";
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

  const isRoleSimulation = interviewType === "Role Simulation";
  const isProjectDefense = interviewType === "Project Defense";
  const isTargetedPractice =
    normalizeString(request.sessionPurpose) === "targeted_practice";
  if (
    isRoleSimulation &&
    (!normalizeString(request.jobTargetId) ||
      !mongoose.isObjectIdOrHexString(request.jobTargetId))
  ) {
    fields.jobTargetId = "Choose a valid ready Job Target.";
  } else if (!isRoleSimulation && request.jobTargetId !== undefined) {
    fields.jobTargetId = "Job Target is available only for Role Simulation.";
  }
  if (
    isProjectDefense &&
    (!normalizeString(request.projectId) ||
      !mongoose.isObjectIdOrHexString(request.projectId))
  ) {
    fields.projectId = "Choose a valid confirmed Project.";
  } else if (!isProjectDefense && request.projectId !== undefined) {
    fields.projectId = "Project is available only for Project Defense.";
  }
  if (
    request.sessionPurpose !== undefined &&
    !["standard", "targeted_practice"].includes(
      normalizeString(request.sessionPurpose),
    )
  ) {
    fields.sessionPurpose = "Choose standard or targeted practice.";
  }
  if (
    isTargetedPractice &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizeString(request.focusSkillKey))
  ) {
    fields.focusSkillKey = "Choose a valid skill to practise.";
  } else if (!isTargetedPractice && request.focusSkillKey !== undefined) {
    fields.focusSkillKey =
      "Focus skill is available only for targeted practice.";
  }
  if (Object.keys(request).some((field) => !allowedFields.has(field))) {
    fields.request = "Request contains unsupported fields.";
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
    ...(isRoleSimulation
      ? {
          jobTargetId: request.jobTargetId,
          sessionPurpose: isTargetedPractice ? "targeted_practice" : "standard",
        }
      : {}),
    ...(isProjectDefense
      ? {
          projectId: request.projectId,
          sessionPurpose: isTargetedPractice ? "targeted_practice" : "standard",
        }
      : {}),
    ...(isTargetedPractice
      ? {
          focusSkillKey: normalizeString(request.focusSkillKey),
          sessionPurpose: "targeted_practice",
        }
      : {}),
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

export function validateVoiceAnswerRequest(body) {
  const request = body && typeof body === "object" ? body : {};
  const allowedFields = new Set(["idempotencyKey", "questionId"]);
  const unexpectedFields = Object.keys(request).filter(
    (field) => !allowedFields.has(field),
  );
  const idempotencyKey = normalizeString(request.idempotencyKey);
  const questionId = normalizeString(request.questionId);
  const fields = {};

  if (unexpectedFields.length > 0) {
    fields.request = "Voice upload contains unexpected fields.";
  }
  if (!mongoose.isObjectIdOrHexString(questionId)) {
    fields.questionId = "Question ID is invalid.";
  }
  if (!idempotencyKeyPattern.test(idempotencyKey)) {
    fields.idempotencyKey = "Request identifier is invalid.";
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError("VALIDATION_ERROR", "Check the highlighted fields.", {
      fields,
      status: 400,
    });
  }

  return { idempotencyKey, questionId };
}
