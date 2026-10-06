import { apiRequest } from "./httpClient.js";

const confidenceLabels = new Set(["provisional", "emerging", "established"]);
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

function isSkill(value) {
  return Boolean(
    exactObject(value, [
      "confidence",
      "evidenceCount",
      "lastPracticedAt",
      "masteryLabel",
      "masteryScore",
      "skillKey",
      "skillLabel",
    ]) &&
    confidenceLabels.has(value.confidence) &&
    Number.isInteger(value.evidenceCount) &&
    value.evidenceCount >= 1 &&
    typeof value.lastPracticedAt === "string" &&
    !Number.isNaN(Date.parse(value.lastPracticedAt)) &&
    masteryLabels.has(value.masteryLabel) &&
    Number.isInteger(value.masteryScore) &&
    value.masteryScore >= 0 &&
    value.masteryScore <= 100 &&
    typeof value.skillKey === "string" &&
    skillKey.test(value.skillKey) &&
    typeof value.skillLabel === "string" &&
    value.skillLabel.trim().length > 0 &&
    value.skillLabel.length <= 80,
  );
}

export async function getSkillProfile({ signal } = {}) {
  const profile = await apiRequest("skills/profile", { signal });
  const action = profile?.recommendedAction;
  const isAction =
    action === null ||
    (exactObject(action, ["skillKey", "type"]) &&
      action.type === "targeted_practice" &&
      typeof action.skillKey === "string" &&
      skillKey.test(action.skillKey));

  if (
    !exactObject(profile, [
      "evidenceSyncStatus",
      "recommendedAction",
      "skills",
    ]) ||
    !["ready", "pending"].includes(profile.evidenceSyncStatus) ||
    !isAction ||
    !Array.isArray(profile.skills) ||
    profile.skills.length > 30 ||
    !profile.skills.every(isSkill)
  ) {
    throw new Error("Skills could not be loaded. Please try again.");
  }
  return profile;
}
