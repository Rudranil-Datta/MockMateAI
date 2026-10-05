import { AppError } from "../utils/AppError.js";
import { validateAdaptiveQuestionOutput } from "../validators/aiSchemas.js";
import { validateAdaptiveInterviewInput } from "../validators/adaptiveInterviewSchemas.js";

const difficultyOrder = ["beginner", "intermediate", "advanced"];
const repetitionThreshold = 0.85;

function invalidProviderDecision() {
  return new AppError(
    "INVALID_AI_RESPONSE",
    "AI practice returned an unusable response. Please try again.",
    { expose: true, status: 502 },
  );
}

function normalizePrompt(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizedPromptSimilarity(left, right) {
  const normalizedLeft = normalizePrompt(left);
  const normalizedRight = normalizePrompt(right);
  const maximumLength = Math.max(normalizedLeft.length, normalizedRight.length);

  if (maximumLength === 0) return 1;

  let previous = Array.from(
    { length: normalizedRight.length + 1 },
    (_, index) => index,
  );

  for (let leftIndex = 1; leftIndex <= normalizedLeft.length; leftIndex += 1) {
    const current = [leftIndex];
    for (
      let rightIndex = 1;
      rightIndex <= normalizedRight.length;
      rightIndex += 1
    ) {
      const substitutionCost =
        normalizedLeft[leftIndex - 1] === normalizedRight[rightIndex - 1]
          ? 0
          : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous = current;
  }

  const distance = previous[normalizedRight.length];
  return 1 - distance / maximumLength;
}

function allowedDifficulty(previousDifficulty, direction) {
  const index = difficultyOrder.indexOf(previousDifficulty);
  const adjacentIndex = Math.max(
    0,
    Math.min(difficultyOrder.length - 1, index + direction),
  );
  return new Set([previousDifficulty, difficultyOrder[adjacentIndex]]);
}

function leastUsedDifferentTopic(coveragePlan, previousQuestions, latestTopic) {
  const counts = new Map(coveragePlan.map(({ topicKey }) => [topicKey, 0]));
  for (const question of previousQuestions) {
    counts.set(question.topicKey, (counts.get(question.topicKey) || 0) + 1);
  }

  return coveragePlan
    .filter(({ topicKey }) => topicKey !== latestTopic)
    .sort(
      (left, right) => counts.get(left.topicKey) - counts.get(right.topicKey),
    )[0];
}

function requiredDecision(input) {
  const {
    coveragePlan,
    focusSkillKey,
    level,
    previousQuestions,
    sessionPurpose,
  } = input;

  if (previousQuestions.length === 0) {
    if (sessionPurpose === "targeted_practice") {
      const topic = coveragePlan.find(({ skillKeys }) =>
        skillKeys.includes(focusSkillKey),
      );
      return {
        allowedDifficulties: new Set([level]),
        decisionType: "retest",
        parentQuestionOrder: null,
        reasonCode: "targeted_retest",
        requiredSkillKey: focusSkillKey,
        topic,
      };
    }

    return {
      allowedDifficulties: new Set([level]),
      ...(["Role Simulation", "Project Defense"].includes(input.interviewType)
        ? { topic: coveragePlan[0] }
        : {
            allowedTopicKeys: new Set(
              coveragePlan.map(({ topicKey }) => topicKey),
            ),
          }),
      decisionType: "baseline",
      parentQuestionOrder: null,
      reasonCode: "opening",
    };
  }

  const latest = previousQuestions.at(-1);
  const preceding = previousQuestions.at(-2);
  const mustSwitch =
    ["clarify", "recover"].includes(latest.decisionType) ||
    (preceding && preceding.topicKey === latest.topicKey);

  if (mustSwitch) {
    const topic = leastUsedDifferentTopic(
      coveragePlan,
      previousQuestions,
      latest.topicKey,
    );
    if (!topic) {
      throw new AppError(
        "ADAPTIVE_SEQUENCE_COMPLETE",
        "No further adaptive question is required for this sequence.",
        { expose: true, status: 409 },
      );
    }
    return {
      allowedDifficulties: new Set([latest.difficulty]),
      decisionType: "switch_topic",
      parentQuestionOrder: null,
      reasonCode: "coverage_gap",
      topic,
    };
  }

  const common = {
    parentQuestionOrder: latest.order,
    topic: coveragePlan.find(({ topicKey }) => topicKey === latest.topicKey),
  };
  if (latest.outcome === "strong") {
    return {
      ...common,
      allowedDifficulties: allowedDifficulty(latest.difficulty, 1),
      decisionType: "deepen",
      reasonCode: "strong_evidence",
    };
  }
  if (latest.outcome === "partial") {
    return {
      ...common,
      allowedDifficulties: new Set([latest.difficulty]),
      decisionType: "clarify",
      reasonCode: "partial_evidence",
    };
  }
  return {
    ...common,
    allowedDifficulties: allowedDifficulty(latest.difficulty, -1),
    decisionType: "recover",
    reasonCode:
      latest.outcome === "missing" ? "missing_evidence" : "weak_evidence",
  };
}

function validateDecision(decision, input, required) {
  if (
    !decision ||
    typeof decision !== "object" ||
    !Array.isArray(decision.testedSkillKeys)
  ) {
    throw invalidProviderDecision();
  }

  const decisionTopic = input.coveragePlan.find(
    ({ topicKey }) => topicKey === decision.topicKey,
  );
  const topicSkills = new Set(decisionTopic?.skillKeys || []);
  const hasAllowedTopic = required.topic
    ? decision.topicKey === required.topic.topicKey
    : required.allowedTopicKeys?.has(decision.topicKey);
  const isRepeated = input.previousQuestions.some(
    ({ prompt }) =>
      normalizedPromptSimilarity(prompt, decision.prompt) >=
      repetitionThreshold,
  );
  const isValid =
    decision.decisionType === required.decisionType &&
    decision.reasonCode === required.reasonCode &&
    hasAllowedTopic &&
    decision.parentQuestionOrder === required.parentQuestionOrder &&
    required.allowedDifficulties.has(decision.difficulty) &&
    decision.testedSkillKeys.every((key) => topicSkills.has(key)) &&
    (!required.requiredSkillKey ||
      decision.testedSkillKeys.includes(required.requiredSkillKey)) &&
    !isRepeated;

  if (!isValid) throw invalidProviderDecision();
  return decision;
}

export function createAdaptiveInterviewService({ aiProviderService }) {
  if (typeof aiProviderService?.generateAdaptiveQuestion !== "function") {
    throw new TypeError(
      "aiProviderService.generateAdaptiveQuestion is required.",
    );
  }

  return {
    async generateNextQuestion(rawInput) {
      const input = validateAdaptiveInterviewInput(rawInput);
      if (input.previousQuestions.length >= 5) {
        throw new AppError(
          "QUESTION_LIMIT_REACHED",
          "This interview has reached its question limit.",
          { status: 409 },
        );
      }

      const required = requiredDecision(input);
      const decision = validateAdaptiveQuestionOutput(
        await aiProviderService.generateAdaptiveQuestion(input),
        input,
      );
      return validateDecision(decision, input, required);
    },
  };
}
