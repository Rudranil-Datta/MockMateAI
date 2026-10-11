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
    textList(value.responsibilities, 1, 10, 5, 600) &&
    textList(value.architecture, 1, 10, 5, 600) &&
    textList(value.decisions, 0, 8, 5, 600) &&
    textList(value.tradeoffs, 0, 8, 5, 600) &&
    Array.isArray(value.claims) &&
    value.claims.length <= 8 &&
    value.claims.every(
      (claim) =>
        exactObject(claim, ["text", "evidence"]) &&
        boundedText(claim.text, 5, 600) &&
        (claim.evidence === null || boundedText(claim.evidence, 5, 600)),
    ) &&
    new Set(value.claims.map(({ text }) => text.trim().toLowerCase())).size ===
      value.claims.length &&
    new TextEncoder().encode(JSON.stringify(value)).length <= 16 * 1024,
  );
}

function safeProject(value) {
  const keys = ["id", ...factKeys, "createdAt", "status", "updatedAt"];
  if (value?.status === undefined) keys.splice(keys.indexOf("status"), 1);
  if (value?.sourceResumeId !== undefined) keys.push("sourceResumeId");
  if (value?.confirmedAt !== undefined) keys.push("confirmedAt");
  if (value?.partialConfirmedAt !== undefined) keys.push("partialConfirmedAt");
  const facts = Object.fromEntries(factKeys.map((key) => [key, value?.[key]]));
  return (
    exactObject(value, keys) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    (((value.status === undefined || value.status === "ready") &&
      safeFacts(facts) &&
      typeof value.confirmedAt === "string") ||
      (value.status === "partial" &&
        safePartialFacts(facts) &&
        typeof value.partialConfirmedAt === "string")) &&
    (value.sourceResumeId === undefined ||
      typeof value.sourceResumeId === "string") &&
    [value.createdAt, value.updatedAt].every(
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

function safePartialFacts(facts) {
  const optionalText = (item, minimum, maximum) =>
    item === null || boundedText(item, minimum, maximum);
  const optionalList = (items, maximum, itemMinimum, itemMaximum) =>
    textList(items, 0, maximum, itemMinimum, itemMaximum);
  const claimsAreValid =
    Array.isArray(facts.claims) &&
    facts.claims.length <= 8 &&
    facts.claims.every(
      (claim) =>
        exactObject(claim, ["text", "evidence"]) &&
        boundedText(claim.text, 5, 600) &&
        (claim.evidence === null || boundedText(claim.evidence, 5, 600)),
    ) &&
    new Set(facts.claims.map(({ text }) => text.trim().toLowerCase())).size ===
      facts.claims.length;
  const hasListValue = (value) => Array.isArray(value) && value.length > 0;
  const hasPlausibleFact =
    Boolean(facts.name || facts.summary) ||
    hasListValue(facts.technologies) ||
    hasListValue(facts.responsibilities) ||
    hasListValue(facts.architecture) ||
    hasListValue(facts.decisions) ||
    hasListValue(facts.tradeoffs) ||
    hasListValue(facts.claims);
  return (
    optionalText(facts.name, 2, 120) &&
    optionalText(facts.summary, 5, 1000) &&
    optionalText(facts.role, 2, 120) &&
    optionalList(facts.technologies, 15, 1, 50) &&
    optionalList(facts.responsibilities, 10, 5, 600) &&
    optionalList(facts.architecture, 10, 5, 600) &&
    optionalList(facts.decisions, 8, 5, 600) &&
    optionalList(facts.tradeoffs, 8, 5, 600) &&
    claimsAreValid &&
    hasPlausibleFact &&
    new TextEncoder().encode(JSON.stringify(facts)).length <= 16 * 1024
  );
}

function safePartialDraft(value) {
  const facts = Object.fromEntries(factKeys.map((key) => [key, value?.[key]]));
  const missingFields = factKeys.filter((key) => {
    const item = facts[key];
    return Array.isArray(item) ? item.length === 0 : item === null;
  });
  return (
    exactObject(value, [
      ...factKeys,
      "missingFields",
      "sourceResumeId",
      "source",
    ]) &&
    safePartialFacts(facts) &&
    value.missingFields.length === missingFields.length &&
    value.missingFields.every(
      (field, index) => field === missingFields[index],
    ) &&
    typeof value.sourceResumeId === "string" &&
    value.source === "resume_suggestion"
  );
}

function safeReadmeDraft(value) {
  const keys = [...factKeys, "source"];
  const boundedOptionalText = (item, maximum) =>
    item === "" || boundedText(item, 1, maximum);
  const boundedOptionalList = (items, maximum, minimum, itemMaximum) =>
    Array.isArray(items) &&
    items.length <= maximum &&
    items.every((item) => boundedText(item, minimum, itemMaximum)) &&
    new Set(items.map((item) => item.trim().toLowerCase())).size ===
      items.length;
  return (
    exactObject(value, keys) &&
    value.source === "readme_import" &&
    boundedOptionalText(value.name, 120) &&
    boundedOptionalText(value.summary, 1000) &&
    boundedOptionalText(value.role, 120) &&
    boundedOptionalList(value.technologies, 15, 1, 50) &&
    boundedOptionalList(value.responsibilities, 10, 5, 600) &&
    boundedOptionalList(value.architecture, 10, 5, 600) &&
    boundedOptionalList(value.decisions, 8, 5, 600) &&
    boundedOptionalList(value.tradeoffs, 8, 5, 600) &&
    Array.isArray(value.claims) &&
    value.claims.length <= 8 &&
    value.claims.every(
      (claim) =>
        exactObject(claim, ["text", "evidence"]) &&
        boundedText(claim.text, 5, 600) &&
        claim.evidence === null,
    )
  );
}

function safeReadmeReview(value) {
  const allowedSections = new Set(factKeys);
  const isKnownFieldList = (items, maximum) =>
    Array.isArray(items) &&
    items.length <= maximum &&
    items.every((item) => allowedSections.has(item)) &&
    new Set(items).size === items.length;
  return (
    exactObject(value, [
      "recognizedSections",
      "missingFields",
      "omittedLineCount",
      "unmatchedText",
    ]) &&
    isKnownFieldList(value.recognizedSections, factKeys.length) &&
    isKnownFieldList(value.missingFields, factKeys.length) &&
    Number.isInteger(value.omittedLineCount) &&
    value.omittedLineCount >= 0 &&
    value.omittedLineCount <= 100000 &&
    typeof value.unmatchedText === "string" &&
    value.unmatchedText.length <= 2000
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
    timeoutMs: 25_000,
  });
  if (
    !exactObject(result, ["drafts"]) ||
    !Array.isArray(result.drafts) ||
    result.drafts.length > 5 ||
    !result.drafts.every((draft) => safeDraft(draft) || safePartialDraft(draft))
  ) {
    unexpected("Project suggestions returned an unexpected response.");
  }
  return result.drafts;
}

export async function importReadmeDraft(file) {
  const formData = new FormData();
  formData.append("readme", file);
  const result = await apiRequest("projects/readme-draft", {
    body: formData,
    method: "POST",
    timeoutMs: 12_000,
  });
  if (
    !exactObject(result, ["draft", "review"]) ||
    !safeReadmeDraft(result.draft) ||
    !safeReadmeReview(result.review)
  ) {
    unexpected("README import returned an unexpected response.");
  }
  return result;
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

export async function createPartialProject(project) {
  const result = await apiRequest("projects/partial", {
    body: { ...project, partialConfirmed: true },
    method: "POST",
  });
  if (!exactObject(result, ["project"]) || !safeProject(result.project))
    unexpected("Saved project returned an unexpected response.");
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

export async function updatePartialProject(projectId, project) {
  const result = await apiRequest(
    `projects/${encodeURIComponent(projectId)}/partial`,
    { body: { ...project, partialConfirmed: true }, method: "PATCH" },
  );
  if (!exactObject(result, ["project"]) || !safeProject(result.project))
    unexpected("Updated project returned an unexpected response.");
  return result.project;
}

export async function deleteProject(projectId) {
  await apiRequest(`projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}
