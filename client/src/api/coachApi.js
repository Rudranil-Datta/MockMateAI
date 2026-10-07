import { apiRequest } from "./httpClient.js";

const actionTypes = new Set([
  "add_context",
  "collect_evidence",
  "confirm_project",
  "review_replay",
  "retest",
  "targeted_practice",
]);
const confidenceValues = new Set([
  "no_evidence",
  "provisional",
  "emerging",
  "established",
]);
const contextKinds = new Set(["overall", "job_target", "candidate_project"]);
const masteryLabels = new Set([
  "needs_work",
  "developing",
  "capable",
  "strong",
]);
const skillKey = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
    value.length <= maximum
  );
}

function safePath(value) {
  if (!boundedText(value, 1, 300) || !value.startsWith("/") || value.startsWith("//")) {
    return false;
  }
  const url = new URL(value, "https://mockmateai.local");
  if (url.origin !== "https://mockmateai.local") return false;
  if (url.pathname === "/targets" || url.pathname === "/projects") {
    return !url.search;
  }
  if (/^\/practice\/[a-f0-9]{24}\/results$/.test(url.pathname)) {
    return !url.search;
  }
  if (url.pathname !== "/practice") return false;
  const allowed = new Set(["focusSkillKey", "targetId", "type"]);
  return [...url.searchParams.keys()].every((key) => allowed.has(key));
}

function isSkill(value) {
  return Boolean(
    exactObject(value, [
      "confidence",
      "evidenceCount",
      "masteryLabel",
      "masteryScore",
      "skillKey",
      "skillLabel",
    ]) &&
      confidenceValues.has(value.confidence) &&
      Number.isInteger(value.evidenceCount) &&
      value.evidenceCount >= 0 &&
      value.evidenceCount <= 20 &&
      (value.masteryLabel === null || masteryLabels.has(value.masteryLabel)) &&
      (value.masteryScore === null ||
        (Number.isInteger(value.masteryScore) &&
          value.masteryScore >= 0 &&
          value.masteryScore <= 100)) &&
      typeof value.skillKey === "string" &&
      skillKey.test(value.skillKey) &&
      boundedText(value.skillLabel, 2, 80) &&
      (value.evidenceCount === 0
        ? value.confidence === "no_evidence" &&
          value.masteryLabel === null &&
          value.masteryScore === null
        : value.confidence !== "no_evidence" &&
          value.masteryLabel !== null &&
          value.masteryScore !== null),
  );
}

function isAction(value) {
  return Boolean(
    exactObject(value, ["description", "label", "to", "type"]) &&
      actionTypes.has(value.type) &&
      boundedText(value.label, 2, 80) &&
      boundedText(value.description, 2, 200) &&
      safePath(value.to),
  );
}

function malformed() {
  const error = new Error("Coach returned an unexpected response. Please try again.");
  error.code = "COACH_MALFORMED_RESPONSE";
  return error;
}

function queryFor({ context, projectId, targetId }) {
  const query = new URLSearchParams({ context });
  if (context === "target" && typeof targetId === "string") {
    query.set("targetId", targetId);
  }
  if (context === "project" && typeof projectId === "string") {
    query.set("projectId", projectId);
  }
  return query.toString();
}

export async function getCoachRoadmap({
  context = "overall",
  projectId,
  signal,
  targetId,
} = {}) {
  const roadmap = await apiRequest(`coach/roadmap?${queryFor({
    context,
    projectId,
    targetId,
  })}`, { signal });
  if (
    !exactObject(roadmap, ["actions", "context", "evidenceSyncStatus", "skills"]) ||
    !exactObject(roadmap.context, ["kind", "label"]) ||
    !contextKinds.has(roadmap.context.kind) ||
    !boundedText(roadmap.context.label, 2, 160) ||
    !["ready", "pending"].includes(roadmap.evidenceSyncStatus) ||
    !Array.isArray(roadmap.skills) ||
    roadmap.skills.length > 12 ||
    !roadmap.skills.every(isSkill) ||
    !Array.isArray(roadmap.actions) ||
    roadmap.actions.length < 3 ||
    roadmap.actions.length > 5 ||
    !roadmap.actions.every(isAction)
  ) {
    throw malformed();
  }
  const expectedKind = {
    overall: "overall",
    project: "candidate_project",
    target: "job_target",
  }[context];
  if (!expectedKind || roadmap.context.kind !== expectedKind) throw malformed();
  return roadmap;
}
