import { AppError } from "../utils/AppError.js";

export const interviewTypes = ["DSA", "HR", "System Design"];
export const interviewLevels = ["beginner", "intermediate", "advanced"];
export const v2InterviewTypes = [
  ...interviewTypes,
  "Role Simulation",
  "Project Defense",
];

const adaptiveDecisionTypes = [
  "baseline",
  "deepen",
  "clarify",
  "recover",
  "switch_topic",
  "retest",
];
const adaptiveReasonCodes = [
  "opening",
  "strong_evidence",
  "partial_evidence",
  "weak_evidence",
  "missing_evidence",
  "coverage_gap",
  "targeted_retest",
];

const maxPreviousQuestions = 5;
const maxResumeContextLength = 2000;
const maxPreviousQuestionLength = 2000;
const maxQuestionPromptLength = 2000;
const maxAnswerLength = 10000;
const maxFeedbackItemLength = 500;
const maxFeedbackItems = 3;
const maxNextStepLength = 1000;
const maxJobDescriptionLength = 12000;
const maxJobTargetAnalysisBytes = 12 * 1024;
const maxProjectContextLength = 8000;
const maxProjectFactsBytes = 16 * 1024;
const maxAdaptiveContextBytes = 16 * 1024;
const maxAdaptiveInputBytes = 32 * 1024;
const skillKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

  const previousQuestions = (input.previousQuestions || []).map((question) => {
    const normalizedQuestion = optionalBoundedText(
      question,
      maxPreviousQuestionLength,
      "Previous question",
    );

    if (!normalizedQuestion) {
      throw invalidInput("Previous questions cannot be blank.");
    }

    return normalizedQuestion;
  });

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

function adaptiveInputText(value, minimum, maximum, fieldName) {
  if (typeof value !== "string") {
    throw invalidInput(`${fieldName} must be text.`);
  }
  const text = value.trim();
  if (text.length < minimum || text.length > maximum) {
    throw invalidInput(`${fieldName} is outside its allowed length.`);
  }
  return text;
}

function adaptiveInputSkillKey(value, fieldName) {
  const key = adaptiveInputText(value, 2, 50, fieldName);
  if (!skillKeyPattern.test(key)) {
    throw invalidInput(`${fieldName} must be a lowercase slug.`);
  }
  return key;
}

function adaptiveInputStringList(value, minimum, maximum, fieldName) {
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum
  ) {
    throw invalidInput(`${fieldName} has an invalid number of entries.`);
  }
  const items = value.map((item) => adaptiveInputSkillKey(item, fieldName));
  if (!uniqueStrings(items)) {
    throw invalidInput(`${fieldName} must contain unique entries.`);
  }
  return items;
}

export function validateAdaptiveQuestionInput(input) {
  const inputKeys = [
    "interviewType",
    "level",
    "sessionPurpose",
    "coveragePlan",
    "previousQuestions",
    "focusSkillKey",
    "contextSummary",
  ];
  if (!exactObject(input, inputKeys)) {
    throw invalidInput("Adaptive question input is invalid.");
  }
  if (!v2InterviewTypes.includes(input.interviewType)) {
    throw invalidInput("Interview type is not supported.");
  }
  if (!interviewLevels.includes(input.level)) {
    throw invalidInput("Interview level is not supported.");
  }
  if (!["standard", "targeted_practice"].includes(input.sessionPurpose)) {
    throw invalidInput("Session purpose is not supported.");
  }
  if (
    !Array.isArray(input.coveragePlan) ||
    input.coveragePlan.length < 1 ||
    input.coveragePlan.length > 12
  ) {
    throw invalidInput("Coverage plan must contain between 1 and 12 entries.");
  }

  const coveragePlan = input.coveragePlan.map((item) => {
    if (!exactObject(item, ["topicKey", "label", "skillKeys"])) {
      throw invalidInput("Coverage plan entry is invalid.");
    }
    return {
      label: adaptiveInputText(item.label, 2, 80, "Coverage label"),
      skillKeys: adaptiveInputStringList(
        item.skillKeys,
        1,
        3,
        "Coverage skill keys",
      ),
      topicKey: adaptiveInputSkillKey(item.topicKey, "Coverage topic key"),
    };
  });
  if (!uniqueStrings(coveragePlan.map(({ topicKey }) => topicKey))) {
    throw invalidInput("Coverage topics must be unique.");
  }
  const knownTopics = new Set(coveragePlan.map(({ topicKey }) => topicKey));
  const knownSkills = new Set(
    coveragePlan.flatMap(({ skillKeys }) => skillKeys),
  );

  if (
    !Array.isArray(input.previousQuestions) ||
    input.previousQuestions.length > 5
  ) {
    throw invalidInput("Previous questions must contain at most 5 entries.");
  }
  const previousQuestions = input.previousQuestions.map((item, index) => {
    if (
      !exactObject(item, [
        "order",
        "prompt",
        "topicKey",
        "testedSkillKeys",
        "difficulty",
        "decisionType",
        "reasonCode",
        "parentQuestionOrder",
        "outcome",
      ]) ||
      item.order !== index + 1 ||
      !knownTopics.has(item.topicKey) ||
      !interviewLevels.includes(item.difficulty) ||
      !adaptiveDecisionTypes.includes(item.decisionType) ||
      !adaptiveReasonCodes.includes(item.reasonCode) ||
      !["strong", "partial", "weak", "missing"].includes(item.outcome) ||
      !(
        item.parentQuestionOrder === null ||
        (Number.isInteger(item.parentQuestionOrder) &&
          item.parentQuestionOrder >= 1 &&
          item.parentQuestionOrder < item.order)
      )
    ) {
      throw invalidInput("Previous question summary is invalid.");
    }
    const testedSkillKeys = adaptiveInputStringList(
      item.testedSkillKeys,
      1,
      3,
      "Tested skill keys",
    );
    if (!testedSkillKeys.every((key) => knownSkills.has(key))) {
      throw invalidInput("Previous question contains an unknown skill.");
    }
    return {
      decisionType: item.decisionType,
      difficulty: item.difficulty,
      outcome: item.outcome,
      order: item.order,
      parentQuestionOrder: item.parentQuestionOrder,
      prompt: adaptiveInputText(
        item.prompt,
        1,
        maxQuestionPromptLength,
        "Previous question prompt",
      ),
      reasonCode: item.reasonCode,
      testedSkillKeys,
      topicKey: item.topicKey,
    };
  });

  const focusSkillKey =
    input.focusSkillKey === null
      ? null
      : adaptiveInputSkillKey(input.focusSkillKey, "Focus skill key");
  if (focusSkillKey && !knownSkills.has(focusSkillKey)) {
    throw invalidInput("Focus skill is not in the coverage plan.");
  }
  const contextSummary =
    input.contextSummary === null
      ? null
      : adaptiveInputText(
          input.contextSummary,
          1,
          maxAdaptiveContextBytes,
          "Context summary",
        );
  if (
    contextSummary &&
    Buffer.byteLength(contextSummary, "utf8") > maxAdaptiveContextBytes
  ) {
    throw invalidInput("Context summary is too large.");
  }

  const normalized = {
    contextSummary,
    coveragePlan,
    focusSkillKey,
    interviewType: input.interviewType,
    level: input.level,
    previousQuestions,
    sessionPurpose: input.sessionPurpose,
  };
  if (
    Buffer.byteLength(JSON.stringify(normalized), "utf8") >
    maxAdaptiveInputBytes
  ) {
    throw invalidInput("Adaptive question input is too large.");
  }
  return normalized;
}

export function validateAdaptiveQuestionOutput(output, input) {
  if (
    !exactObject(output, [
      "prompt",
      "topicKey",
      "testedSkillKeys",
      "difficulty",
      "decisionType",
      "reasonCode",
      "parentQuestionOrder",
    ]) ||
    !input ||
    !input.coveragePlan
  ) {
    throw invalidOutput();
  }
  const knownTopics = new Set(
    input.coveragePlan.map(({ topicKey }) => topicKey),
  );
  const knownSkills = new Set(
    input.coveragePlan.flatMap(({ skillKeys }) => skillKeys),
  );
  const testedSkillKeys = Array.isArray(output.testedSkillKeys)
    ? output.testedSkillKeys.map((key) => {
        if (
          typeof key !== "string" ||
          !skillKeyPattern.test(key) ||
          key.length < 2 ||
          key.length > 50
        ) {
          throw invalidOutput();
        }
        return key;
      })
    : null;
  const priorOrders = new Set(
    input.previousQuestions.map(({ order }) => order),
  );
  if (
    typeof output.prompt !== "string" ||
    !output.prompt.trim() ||
    output.prompt.trim().length > maxQuestionPromptLength ||
    !knownTopics.has(output.topicKey) ||
    !testedSkillKeys ||
    testedSkillKeys.length < 1 ||
    testedSkillKeys.length > 3 ||
    !uniqueStrings(testedSkillKeys) ||
    !testedSkillKeys.every((key) => knownSkills.has(key)) ||
    !interviewLevels.includes(output.difficulty) ||
    !adaptiveDecisionTypes.includes(output.decisionType) ||
    !adaptiveReasonCodes.includes(output.reasonCode) ||
    !(
      output.parentQuestionOrder === null ||
      (Number.isInteger(output.parentQuestionOrder) &&
        priorOrders.has(output.parentQuestionOrder))
    )
  ) {
    throw invalidOutput();
  }
  return {
    decisionType: output.decisionType,
    difficulty: output.difficulty,
    parentQuestionOrder: output.parentQuestionOrder,
    prompt: output.prompt.trim(),
    reasonCode: output.reasonCode,
    testedSkillKeys,
    topicKey: output.topicKey,
  };
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

function exactObject(value, expectedKeys) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

function boundedRequiredText(value, minimum, maximum) {
  if (typeof value !== "string") throw invalidOutput();
  const text = value.trim();
  if (text.length < minimum || text.length > maximum) throw invalidOutput();
  return text;
}

function uniqueStrings(items) {
  const normalized = items.map((item) => item.toLowerCase());
  return new Set(normalized).size === normalized.length;
}

export function validateJobTargetAnalysisInput(input) {
  if (!exactObject(input, ["title", "company", "description"])) {
    throw invalidInput("Job Target analysis input is invalid.");
  }
  const title = optionalBoundedText(input.title, 120, "Job title");
  const company = optionalBoundedText(input.company, 120, "Company");
  const description = optionalBoundedText(
    input.description,
    maxJobDescriptionLength,
    "Job description",
  );
  if (!title || title.length < 2 || !description || description.length < 100) {
    throw invalidInput("Job Target title and description are required.");
  }
  if (company && company.length < 2) {
    throw invalidInput("Company is too short.");
  }
  return { title, company, description };
}

export function validateJobTargetAnalysisOutput(output) {
  if (
    !exactObject(output, ["roleSummary", "requirements", "skills"]) ||
    Buffer.byteLength(JSON.stringify(output), "utf8") >
      maxJobTargetAnalysisBytes ||
    !Array.isArray(output.requirements) ||
    output.requirements.length < 1 ||
    output.requirements.length > 12 ||
    !Array.isArray(output.skills) ||
    output.skills.length < 1 ||
    output.skills.length > 12
  ) {
    throw invalidOutput();
  }

  const requirements = output.requirements.map((requirement) => {
    if (
      !exactObject(requirement, [
        "key",
        "label",
        "priority",
        "evidenceTerms",
      ]) ||
      typeof requirement.key !== "string" ||
      !skillKeyPattern.test(requirement.key) ||
      requirement.key.length < 2 ||
      requirement.key.length > 50 ||
      !["required", "preferred", "context"].includes(requirement.priority) ||
      !Array.isArray(requirement.evidenceTerms) ||
      requirement.evidenceTerms.length > 5
    ) {
      throw invalidOutput();
    }
    const evidenceTerms = requirement.evidenceTerms.map((item) =>
      boundedRequiredText(item, 2, 80),
    );
    if (!uniqueStrings(evidenceTerms)) throw invalidOutput();
    return {
      evidenceTerms,
      key: requirement.key,
      label: boundedRequiredText(requirement.label, 2, 80),
      priority: requirement.priority,
    };
  });
  if (!uniqueStrings(requirements.map(({ key }) => key))) throw invalidOutput();
  const requirementKeys = new Set(requirements.map(({ key }) => key));

  const skills = output.skills.map((skill) => {
    if (
      !exactObject(skill, [
        "key",
        "label",
        "weight",
        "sourceRequirementKeys",
      ]) ||
      typeof skill.key !== "string" ||
      !skillKeyPattern.test(skill.key) ||
      skill.key.length < 2 ||
      skill.key.length > 50 ||
      !Number.isInteger(skill.weight) ||
      skill.weight < 1 ||
      skill.weight > 5 ||
      !Array.isArray(skill.sourceRequirementKeys) ||
      skill.sourceRequirementKeys.length < 1 ||
      skill.sourceRequirementKeys.length > 5 ||
      !skill.sourceRequirementKeys.every(
        (key) => requirementKeys.has(key) && skillKeyPattern.test(key),
      ) ||
      !uniqueStrings(skill.sourceRequirementKeys)
    ) {
      throw invalidOutput();
    }
    return {
      key: skill.key,
      label: boundedRequiredText(skill.label, 2, 80),
      sourceRequirementKeys: skill.sourceRequirementKeys,
      weight: skill.weight,
    };
  });
  if (!uniqueStrings(skills.map(({ key }) => key))) throw invalidOutput();

  return {
    requirements,
    roleSummary: boundedRequiredText(output.roleSummary, 20, 500),
    skills,
  };
}

const projectFactKeys = [
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

function projectOutputText(value, minimum, maximum) {
  return boundedRequiredText(value, minimum, maximum);
}

function projectOutputList(value, minimum, maximum, itemMinimum, itemMaximum) {
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum
  ) {
    throw invalidOutput();
  }
  const items = value.map((item) =>
    projectOutputText(item, itemMinimum, itemMaximum),
  );
  if (!uniqueStrings(items)) throw invalidOutput();
  return items;
}

function validateProjectDraft(draft) {
  if (!exactObject(draft, projectFactKeys)) throw invalidOutput();
  const claims = Array.isArray(draft.claims)
    ? draft.claims.map((claim) => {
        if (!exactObject(claim, ["text", "evidence"])) throw invalidOutput();
        return {
          text: projectOutputText(claim.text, 5, 300),
          evidence:
            claim.evidence === null
              ? null
              : projectOutputText(claim.evidence, 5, 300),
        };
      })
    : null;
  if (
    !claims ||
    claims.length > 8 ||
    !uniqueStrings(claims.map(({ text }) => text))
  ) {
    throw invalidOutput();
  }
  const normalized = {
    name: projectOutputText(draft.name, 2, 120),
    summary: projectOutputText(draft.summary, 20, 1000),
    role: projectOutputText(draft.role, 2, 120),
    technologies: projectOutputList(draft.technologies, 1, 15, 1, 50),
    responsibilities: projectOutputList(draft.responsibilities, 1, 10, 5, 300),
    architecture: projectOutputList(draft.architecture, 1, 10, 5, 300),
    decisions: projectOutputList(draft.decisions, 0, 8, 5, 300),
    tradeoffs: projectOutputList(draft.tradeoffs, 0, 8, 5, 300),
    claims,
  };
  if (
    Buffer.byteLength(JSON.stringify(normalized), "utf8") > maxProjectFactsBytes
  ) {
    throw invalidOutput();
  }
  return normalized;
}

export function validateProjectExtractionInput(input) {
  if (!exactObject(input, ["resumeContext"])) {
    throw invalidInput("Project extraction input is invalid.");
  }
  const resumeContext = optionalBoundedText(
    input.resumeContext,
    maxProjectContextLength,
    "Resume context",
  );
  if (!resumeContext) throw invalidInput("Resume context is required.");
  return { resumeContext };
}

export function validateProjectExtractionOutput(output) {
  if (!exactObject(output, ["drafts"]) || !Array.isArray(output.drafts)) {
    throw invalidOutput();
  }
  if (output.drafts.length > 5) throw invalidOutput();
  return { drafts: output.drafts.map(validateProjectDraft) };
}
