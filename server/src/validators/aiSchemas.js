import { AppError } from "../utils/AppError.js";

export const interviewTypes = ["DSA", "HR", "System Design"];
export const interviewLevels = ["beginner", "intermediate", "advanced"];

const maxPreviousQuestions = 5;
const maxResumeContextLength = 4000;
const maxPreviousQuestionLength = 2000;
const maxQuestionPromptLength = 2000;
const maxAnswerLength = 10000;
const maxFeedbackItemLength = 500;
const maxFeedbackItems = 3;
const maxNextStepLength = 1000;

function invalidInput(message) {
  return new AppError("INVALID_AI_REQUEST", message, { status: 400 });
}

function invalidOutput() {
  return new AppError(
    "INVALID_AI_RESPONSE",
    "AI practice returned an unusable response. Please try again.",
    { expose: true, status: 502 },
  );
}

function optionalBoundedText(value, maximum, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw invalidInput(`${fieldName} must be text.`);
  }

  const text = value.trim();
  if (text.length > maximum) {
    throw invalidInput(`${fieldName} is too long.`);
  }

  return text || undefined;
}

export function validateQuestionInput(input) {
  if (!input || typeof input !== "object") {
    throw invalidInput("Question input is required.");
  }

  if (!interviewTypes.includes(input.interviewType)) {
    throw invalidInput("Interview type is not supported.");
  }

  if (!interviewLevels.includes(input.level)) {
    throw invalidInput("Interview level is not supported.");
  }

  if (
    input.previousQuestions !== undefined &&
    !Array.isArray(input.previousQuestions)
  ) {
    throw invalidInput("Previous questions must be a list.");
  }

  const previousQuestions = (input.previousQuestions || []).map(
    (question) =>
      optionalBoundedText(
        question,
        maxPreviousQuestionLength,
        "Previous question",
      ) || invalidInput("Previous questions cannot be blank."),
  );

  if (previousQuestions.length > maxPreviousQuestions) {
    throw invalidInput("Too many previous questions.");
  }

  return {
    interviewType: input.interviewType,
    level: input.level,
    previousQuestions,
    resumeContext: optionalBoundedText(
      input.resumeContext,
      maxResumeContextLength,
      "Resume context",
    ),
  };
}

export function validateQuestionOutput(output) {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw invalidOutput();
  }

  const keys = Object.keys(output);
  if (keys.length !== 1 || keys[0] !== "prompt") {
    throw invalidOutput();
  }

  if (typeof output.prompt !== "string") {
    throw invalidOutput();
  }

  const prompt = output.prompt.trim();
  if (!prompt || prompt.length > maxQuestionPromptLength) {
    throw invalidOutput();
  }

  return { prompt };
}

export function validateEvaluationInput(input) {
  if (!input || typeof input !== "object") {
    throw invalidInput("Evaluation input is required.");
  }

  if (!interviewTypes.includes(input.interviewType)) {
    throw invalidInput("Interview type is not supported.");
  }

  if (!interviewLevels.includes(input.level)) {
    throw invalidInput("Interview level is not supported.");
  }

  const question = optionalBoundedText(
    input.question,
    maxQuestionPromptLength,
    "Question",
  );
  const answer = optionalBoundedText(input.answer, maxAnswerLength, "Answer");

  if (!question || !answer) {
    throw invalidInput("Question and answer are required.");
  }

  return {
    answer,
    interviewType: input.interviewType,
    level: input.level,
    question,
  };
}

function validateFeedbackTextList(value) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > maxFeedbackItems
  ) {
    throw invalidOutput();
  }

  const items = value.map((item) => {
    if (typeof item !== "string") {
      throw invalidOutput();
    }

    const text = item.trim();
    if (!text || text.length > maxFeedbackItemLength) {
      throw invalidOutput();
    }

    return text;
  });

  return items;
}

function validateScore(value) {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw invalidOutput();
  }

  return value;
}

export function validateEvaluationOutput(output) {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw invalidOutput();
  }

  const expectedKeys = [
    "overallScore",
    "accuracyScore",
    "clarityScore",
    "confidenceScore",
    "strengths",
    "improvements",
    "nextStep",
  ];
  const keys = Object.keys(output);

  if (
    keys.length !== expectedKeys.length ||
    !expectedKeys.every((key) => keys.includes(key))
  ) {
    throw invalidOutput();
  }

  if (typeof output.nextStep !== "string") {
    throw invalidOutput();
  }

  const nextStep = output.nextStep.trim();
  if (!nextStep || nextStep.length > maxNextStepLength) {
    throw invalidOutput();
  }

  return {
    accuracyScore: validateScore(output.accuracyScore),
    clarityScore: validateScore(output.clarityScore),
    confidenceScore: validateScore(output.confidenceScore),
    improvements: validateFeedbackTextList(output.improvements),
    nextStep,
    overallScore: validateScore(output.overallScore),
    strengths: validateFeedbackTextList(output.strengths),
  };
}
