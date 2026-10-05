import { apiRequest } from "./httpClient.js";

const statuses = new Set(["analysis_pending", "ready", "analysis_failed"]);
const priorities = new Set(["required", "preferred", "context"]);
const failureCodes = new Set([
  "quota",
  "timeout",
  "unavailable",
  "invalid_response",
]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isExactObject(value, requiredKeys, optionalKeys = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  const keys = Object.keys(value);
  return (
    requiredKeys.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => allowedKeys.has(key))
  );
}

function isBoundedString(value, minimum, maximum) {
  return (
    typeof value === "string" &&
    value.trim().length >= minimum &&
    value.length <= maximum
  );
}

function isAnalysis(analysis) {
  if (!isExactObject(analysis, ["requirements", "roleSummary", "skills"])) {
    return false;
  }
  if (
    !isBoundedString(analysis.roleSummary, 20, 500) ||
    !Array.isArray(analysis.requirements) ||
    analysis.requirements.length < 1 ||
    analysis.requirements.length > 12 ||
    !Array.isArray(analysis.skills) ||
    analysis.skills.length < 1 ||
    analysis.skills.length > 12
  ) {
    return false;
  }

  const requirementKeys = new Set();
  for (const requirement of analysis.requirements) {
    if (
      !isExactObject(requirement, [
        "evidenceTerms",
        "key",
        "label",
        "priority",
      ]) ||
      !isBoundedString(requirement.key, 2, 50) ||
      !slugPattern.test(requirement.key) ||
      requirementKeys.has(requirement.key) ||
      !isBoundedString(requirement.label, 2, 80) ||
      !priorities.has(requirement.priority) ||
      !Array.isArray(requirement.evidenceTerms) ||
      requirement.evidenceTerms.length > 5 ||
      !requirement.evidenceTerms.every((term) => isBoundedString(term, 2, 80))
    ) {
      return false;
    }
    requirementKeys.add(requirement.key);
  }

  const skillKeys = new Set();
  for (const skill of analysis.skills) {
    if (
      !isExactObject(skill, [
        "key",
        "label",
        "sourceRequirementKeys",
        "weight",
      ]) ||
      !isBoundedString(skill.key, 2, 50) ||
      !slugPattern.test(skill.key) ||
      skillKeys.has(skill.key) ||
      !isBoundedString(skill.label, 2, 80) ||
      !Number.isInteger(skill.weight) ||
      skill.weight < 1 ||
      skill.weight > 5 ||
      !Array.isArray(skill.sourceRequirementKeys) ||
      skill.sourceRequirementKeys.length < 1 ||
      skill.sourceRequirementKeys.length > 5 ||
      new Set(skill.sourceRequirementKeys).size !==
        skill.sourceRequirementKeys.length ||
      !skill.sourceRequirementKeys.every((key) => requirementKeys.has(key))
    ) {
      return false;
    }
    skillKeys.add(skill.key);
  }

  return JSON.stringify(analysis).length <= 12 * 1024;
}

function isJobTarget(target) {
  if (
    !isExactObject(
      target,
      ["createdAt", "description", "id", "status", "title", "updatedAt"],
      ["analysis", "analysisFailureCode", "company"],
    ) ||
    !isBoundedString(target.id, 1, 100) ||
    !isBoundedString(target.title, 2, 120) ||
    !isBoundedString(target.description, 100, 12_000) ||
    !statuses.has(target.status) ||
    typeof target.createdAt !== "string" ||
    typeof target.updatedAt !== "string" ||
    Number.isNaN(Date.parse(target.createdAt)) ||
    Number.isNaN(Date.parse(target.updatedAt)) ||
    (target.company !== undefined && !isBoundedString(target.company, 2, 120))
  ) {
    return false;
  }

  if (target.status === "ready") {
    return (
      isAnalysis(target.analysis) && target.analysisFailureCode === undefined
    );
  }
  if (target.status === "analysis_failed") {
    return (
      target.analysis === undefined &&
      failureCodes.has(target.analysisFailureCode)
    );
  }
  return (
    target.analysis === undefined && target.analysisFailureCode === undefined
  );
}

export async function listJobTargets({ signal } = {}) {
  const result = await apiRequest("job-targets", { signal });

  if (
    !isExactObject(result, ["items"]) ||
    !Array.isArray(result.items) ||
    result.items.length > 50 ||
    !result.items.every(isJobTarget)
  ) {
    throw new Error("Job Targets could not be loaded. Please try again.");
  }

  return result.items;
}
