import { apiRequest } from "./httpClient.js";

const contextKinds = new Set(["job_target", "candidate_project"]);
const interviewTypes = new Set([
  "DSA",
  "HR",
  "System Design",
  "Role Simulation",
  "Project Defense",
]);
const levels = new Set(["beginner", "intermediate", "advanced"]);
const confidence = new Set(["provisional", "emerging", "established"]);
const mastery = new Set(["needs_work", "developing", "capable", "strong"]);
const stageTypes = new Set([
  "opening",
  "planned_coverage",
  "adaptive_follow_up",
]);
const topicKey = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const adaptiveNotice =
  "Later questions adapt to your answers and are not prewritten.";

function exact(value, keys) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key)),
  );
}

function malformed() {
  const error = new Error(
    "Interview plan returned an unexpected response. Please try again.",
  );
  error.code = "INTERVIEW_PLAN_MALFORMED_RESPONSE";
  return error;
}

function query(selection) {
  const params = new URLSearchParams({
    interviewType: selection.interviewType || "",
    level: selection.level || "",
  });
  [
    "focusSkillKey",
    "jobTargetId",
    "projectId",
    "resumeId",
    "sessionPurpose",
  ].forEach((key) => {
    if (selection[key]) params.set(key, selection[key]);
  });
  return params.toString();
}

export async function getInterviewPlan({ signal, ...selection } = {}) {
  const plan = await apiRequest(`interviews/plan?${query(selection)}`, {
    signal,
  });
  if (
    !exact(plan, [
      "adaptiveNotice",
      "context",
      "openingFocus",
      "rationale",
      "selection",
      "stages",
    ]) ||
    plan.adaptiveNotice !== adaptiveNotice ||
    !exact(
      plan.selection,
      Object.hasOwn(plan.selection || {}, "focusSkillKey")
        ? ["focusSkillKey", "interviewType", "level", "sessionPurpose"]
        : ["interviewType", "level", "sessionPurpose"],
    ) ||
    !interviewTypes.has(plan.selection.interviewType) ||
    !levels.has(plan.selection.level) ||
    !["standard", "targeted_practice"].includes(
      plan.selection.sessionPurpose,
    ) ||
    (plan.selection.sessionPurpose === "targeted_practice"
      ? !topicKey.test(plan.selection.focusSkillKey || "")
      : Object.hasOwn(plan.selection, "focusSkillKey")) ||
    !(
      plan.context === null ||
      (exact(plan.context, ["kind", "label"]) &&
        contextKinds.has(plan.context.kind) &&
        typeof plan.context.label === "string" &&
        plan.context.label.trim().length <= 160)
    ) ||
    !Array.isArray(plan.stages) ||
    plan.stages.length < 1 ||
    plan.stages.length > 5
  )
    throw malformed();
  if (
    !plan.stages.every(
      (stage, index) =>
        exact(stage, ["focus", "order", "type"]) &&
        exact(stage.focus, ["label", "topicKey"]) &&
        typeof stage.focus.label === "string" &&
        stage.focus.label.trim().length > 0 &&
        stage.focus.label.length <= 80 &&
        topicKey.test(stage.focus.topicKey) &&
        stage.order === index + 1 &&
        stageTypes.has(stage.type),
    )
  )
    throw malformed();
  if (
    !exact(plan.openingFocus, ["label", "topicKey"]) ||
    plan.openingFocus.label !== plan.stages[0].focus.label ||
    plan.openingFocus.topicKey !== plan.stages[0].focus.topicKey
  )
    throw malformed();
  const expectedRationale =
    plan.rationale?.kind === "targeted_evidence"
      ? exact(plan.rationale, [
          "confidence",
          "evidenceCount",
          "kind",
          "masteryLabel",
        ]) &&
        confidence.has(plan.rationale.confidence) &&
        Number.isInteger(plan.rationale.evidenceCount) &&
        plan.rationale.evidenceCount > 0 &&
        plan.rationale.evidenceCount <= 20 &&
        mastery.has(plan.rationale.masteryLabel)
      : exact(plan.rationale, ["kind"]) &&
        ["target_coverage", "project_coverage", "type_level"].includes(
          plan.rationale.kind,
        );
  if (!expectedRationale) throw malformed();
  if (
    plan.selection.interviewType !== selection.interviewType ||
    plan.selection.level !== selection.level ||
    plan.selection.sessionPurpose !==
      (selection.sessionPurpose || "standard") ||
    (selection.focusSkillKey || undefined) !==
      (plan.selection.focusSkillKey || undefined)
  )
    throw malformed();
  const expectedContextKind =
    selection.interviewType === "Role Simulation"
      ? "job_target"
      : selection.interviewType === "Project Defense"
        ? "candidate_project"
        : null;
  if (
    (expectedContextKind === null) !== (plan.context === null) ||
    (expectedContextKind && plan.context.kind !== expectedContextKind)
  )
    throw malformed();
  return plan;
}
