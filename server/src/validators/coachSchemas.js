import mongoose from "mongoose";

import { AppError } from "../utils/AppError.js";

function invalid(fields = {}) {
  throw new AppError("VALIDATION_ERROR", "Check the highlighted fields.", {
    fields,
    status: 400,
  });
}

function queryObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalid({ request: "Coach context is invalid." });
  }
  return value;
}

function contextValue(value) {
  if (typeof value !== "string") {
    invalid({ context: "Choose Overall, Job Target, or Project." });
  }
  const context = value.trim();
  if (!new Set(["overall", "target", "project"]).has(context)) {
    invalid({ context: "Choose Overall, Job Target, or Project." });
  }
  return context;
}

function objectId(value, field) {
  if (typeof value !== "string" || !mongoose.isObjectIdOrHexString(value)) {
    invalid({ [field]: `${field} is invalid.` });
  }
  return value;
}

export function validateCoachContextQuery(query) {
  const input = queryObject(query);
  const context = contextValue(input.context);
  const idField = context === "target" ? "targetId" : "projectId";
  const allowed = new Set(
    context === "overall" ? ["context"] : ["context", idField],
  );
  const unexpected = Object.keys(input).filter((key) => !allowed.has(key));
  if (unexpected.length) {
    invalid({ request: "Coach context contains unsupported fields." });
  }
  if (context === "overall") return { context };
  return { context, [idField]: objectId(input[idField], idField) };
}

export const validateCoachRoadmapQuery = validateCoachContextQuery;
