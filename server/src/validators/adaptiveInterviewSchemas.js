import { AppError } from "../utils/AppError.js";
import { validateAdaptiveQuestionInput } from "./aiSchemas.js";

function invalidInput(message) {
  return new AppError("INVALID_AI_REQUEST", message, { status: 400 });
}

function exactObject(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index])
  );
}

export function deriveAdaptiveOutcome(overallScore) {
  if (
    !Number.isInteger(overallScore) ||
    overallScore < 0 ||
    overallScore > 100
  ) {
    throw invalidInput("Previous question score is invalid.");
  }

  if (overallScore === 0) return "missing";
  if (overallScore < 60) return "weak";
  if (overallScore < 85) return "partial";
  return "strong";
}

export function validateAdaptiveInterviewInput(input) {
  const inputKeys = [
    "challengeDirective",
    "interviewType",
    "level",
    "sessionPurpose",
    "coveragePlan",
    "previousQuestions",
    "focusSkillKey",
    "contextSummary",
  ];
  if (
    !exactObject(input, inputKeys) ||
    !Array.isArray(input.previousQuestions)
  ) {
    throw invalidInput("Adaptive interview input is invalid.");
  }

  const previousQuestions = input.previousQuestions.map((question) => {
    if (
      !exactObject(question, [
        "order",
        "prompt",
        "topicKey",
        "testedSkillKeys",
        "difficulty",
        "decisionType",
        "reasonCode",
        "parentQuestionOrder",
        "overallScore",
      ])
    ) {
      throw invalidInput("Previous question summary is invalid.");
    }

    const { overallScore, ...summary } = question;
    return {
      ...summary,
      outcome: deriveAdaptiveOutcome(overallScore),
    };
  });

  const normalized = validateAdaptiveQuestionInput({
    ...input,
    previousQuestions,
  });

  if (
    normalized.sessionPurpose === "targeted_practice" &&
    !normalized.focusSkillKey
  ) {
    throw invalidInput("Targeted practice requires a focus skill.");
  }

  return normalized;
}
