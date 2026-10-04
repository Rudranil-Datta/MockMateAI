import { apiRequest } from "./httpClient.js";

const factKeys = [
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

function exactObject(value, keys) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key)),
  );
}

function boundedText(value, minimum, maximum) {
  return (
    typeof value === "string" &&
    value.trim().length >= minimum &&
    value.trim().length <= maximum
  );
}

function textList(value, minimum, maximum, itemMinimum, itemMaximum) {
  return (
    Array.isArray(value) &&
    value.length >= minimum &&
    value.length <= maximum &&
    value.every((item) => boundedText(item, itemMinimum, itemMaximum)) &&
    new Set(value.map((item) => item.trim().toLowerCase())).size ===
      value.length
  );
}

function safeFacts(value) {
  return Boolean(
    exactObject(value, factKeys) &&
    boundedText(value.name, 2, 120) &&
    boundedText(value.summary, 20, 1000) &&
    boundedText(value.role, 2, 120) &&
    textList(value.technologies, 1, 15, 1, 50) &&
    textList(value.responsibilities, 1, 10, 5, 300) &&
    textList(value.architecture, 1, 10, 5, 300) &&
    textList(value.decisions, 0, 8, 5, 300) &&
    textList(value.tradeoffs, 0, 8, 5, 300) &&
    Array.isArray(value.claims) &&
    value.claims.length <= 8 &&
    value.claims.every(
      (claim) =>
        exactObject(claim, ["text", "evidence"]) &&
        boundedText(claim.text, 5, 300) &&
        (claim.evidence === null || boundedText(claim.evidence, 5, 300)),
    ) &&
    new Set(value.claims.map(({ text }) => text.trim().toLowerCase())).size ===
      value.claims.length &&
    new TextEncoder().encode(JSON.stringify(value)).length <= 16 * 1024,
  );
}

function safeProject(value) {
  const keys = ["id", ...factKeys, "confirmedAt", "createdAt", "updatedAt"];
  if (value?.sourceResumeId !== undefined) keys.push("sourceResumeId");
  const facts = Object.fromEntries(factKeys.map((key) => [key, value?.[key]]));
  return (
    exactObject(value, keys) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    safeFacts(facts) &&
    (value.sourceResumeId === undefined ||
      typeof value.sourceResumeId === "string") &&
    [value.confirmedAt, value.createdAt, value.updatedAt].every(
      (date) => typeof date === "string" && !Number.isNaN(Date.parse(date)),
    )
  );
}

function safeDraft(value) {
  const facts = Object.fromEntries(factKeys.map((key) => [key, value?.[key]]));
  return (
    exactObject(value, [...factKeys, "sourceResumeId", "source"]) &&
    safeFacts(facts) &&
    typeof value.sourceResumeId === "string" &&
    value.source === "resume_suggestion"
  );
}

function unexpected(message) {
  throw new Error(message);
}

export async function extractProjectDrafts({
  idempotencyKey,
  resumeId,
  signal,
}) {
  const result = await apiRequest("projects/extract", {
    body: { idempotencyKey, resumeId },
    method: "POST",
    signal,
    timeoutMs: 12_000,
  });
  if (
    !exactObject(result, ["drafts"]) ||
    !Array.isArray(result.drafts) ||
    result.drafts.length > 5 ||
    !result.drafts.every(safeDraft)
  ) {
    unexpected("Project suggestions returned an unexpected response.");
  }
  return result.drafts;
}

export async function listProjects({ signal } = {}) {
  const result = await apiRequest("projects", { signal });
  if (
    !exactObject(result, ["items"]) ||
    !Array.isArray(result.items) ||
    result.items.length > 50 ||
    !result.items.every(safeProject)
  ) {
    unexpected("Projects could not be loaded. Please try again.");
  }
  return result.items;
}

export async function getProject(projectId, { signal } = {}) {
  const result = await apiRequest(`projects/${encodeURIComponent(projectId)}`, {
    signal,
  });
  if (!exactObject(result, ["project"]) || !safeProject(result.project)) {
    unexpected("Project returned an unexpected response.");
  }
  return result.project;
}

export async function createProject(project) {
  const result = await apiRequest("projects", {
    body: { ...project, confirmed: true },
    method: "POST",
  });
  if (!exactObject(result, ["project"]) || !safeProject(result.project)) {
    unexpected("Saved project returned an unexpected response.");
  }
  return result.project;
}

export async function updateProject(projectId, project) {
  const result = await apiRequest(`projects/${encodeURIComponent(projectId)}`, {
    body: { ...project, confirmed: true },
    method: "PATCH",
  });
  if (!exactObject(result, ["project"]) || !safeProject(result.project)) {
    unexpected("Updated project returned an unexpected response.");
  }
  return result.project;
}

export async function deleteProject(projectId) {
  await apiRequest(`projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}
