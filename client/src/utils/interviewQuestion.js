const skillKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const decisionTypes = new Set([
  "baseline",
  "deepen",
  "clarify",
  "recover",
  "switch_topic",
  "retest",
]);
const reasonCodes = new Set([
  "opening",
  "strong_evidence",
  "partial_evidence",
  "weak_evidence",
  "missing_evidence",
  "coverage_gap",
  "targeted_retest",
]);
const metadataKeys = [
  "topicKey",
  "testedSkillKeys",
  "difficulty",
  "parentQuestionId",
  "decisionType",
  "reasonCode",
];
const requiredMetadataKeys = metadataKeys.filter(
  (key) => key !== "parentQuestionId",
);

export function hasValidAdaptiveQuestionMetadata(question) {
  const presentKeys = metadataKeys.filter((key) =>
    Object.hasOwn(question, key),
  );
  if (presentKeys.length === 0) return true;
  if (!requiredMetadataKeys.every((key) => Object.hasOwn(question, key))) {
    return false;
  }
  const skillKeys = question.testedSkillKeys;
  return Boolean(
    typeof question.topicKey === "string" &&
    question.topicKey.length >= 2 &&
    question.topicKey.length <= 50 &&
    skillKeyPattern.test(question.topicKey) &&
    Array.isArray(skillKeys) &&
    skillKeys.length >= 1 &&
    skillKeys.length <= 3 &&
    skillKeys.every(
      (key) =>
        typeof key === "string" &&
        key.length >= 2 &&
        key.length <= 50 &&
        skillKeyPattern.test(key),
    ) &&
    new Set(skillKeys).size === skillKeys.length &&
    ["beginner", "intermediate", "advanced"].includes(question.difficulty) &&
    decisionTypes.has(question.decisionType) &&
    reasonCodes.has(question.reasonCode) &&
    (!Object.hasOwn(question, "parentQuestionId") ||
      (typeof question.parentQuestionId === "string" &&
        /^[a-f0-9]{24}$/i.test(question.parentQuestionId))),
  );
}
