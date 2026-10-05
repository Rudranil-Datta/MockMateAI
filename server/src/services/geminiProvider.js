import { GoogleGenAI } from "@google/genai";

const questionJsonSchema = {
  additionalProperties: false,
  properties: {
    prompt: { minLength: 1, type: "string" },
  },
  required: ["prompt"],
  type: "object",
};

function adaptiveQuestionJsonSchema({
  challengeDirective,
  coveragePlan,
  previousQuestions,
}) {
  const skillKeys = [
    ...new Set(coveragePlan.flatMap(({ skillKeys: keys }) => keys)),
  ];
  const priorOrders = previousQuestions.map(({ order }) => order);
  const schema = {
    additionalProperties: false,
    properties: {
      decisionType: {
        enum: [
          "baseline",
          "deepen",
          "clarify",
          "recover",
          "switch_topic",
          "retest",
        ],
        type: "string",
      },
      difficulty: {
        enum: ["beginner", "intermediate", "advanced"],
        type: "string",
      },
      parentQuestionOrder: priorOrders.length
        ? { enum: [null, ...priorOrders], nullable: true, type: "integer" }
        : { nullable: true, type: "integer" },
      prompt: { maxLength: 2000, minLength: 1, type: "string" },
      reasonCode: {
        enum: [
          "opening",
          "strong_evidence",
          "partial_evidence",
          "weak_evidence",
          "missing_evidence",
          "coverage_gap",
          "targeted_retest",
        ],
        type: "string",
      },
      testedSkillKeys: {
        items: { enum: skillKeys, type: "string" },
        maxItems: 3,
        minItems: 1,
        type: "array",
      },
      topicKey: {
        enum: coveragePlan.map(({ topicKey }) => topicKey),
        type: "string",
      },
    },
    required: [
      "prompt",
      "topicKey",
      "testedSkillKeys",
      "difficulty",
      "decisionType",
      "reasonCode",
      "parentQuestionOrder",
    ],
    type: "object",
  };
  if (challengeDirective) {
    schema.properties.challengeAnchorKey = {
      enum: [challengeDirective.anchorKey],
      type: "string",
    };
    schema.properties.challengeAxis = {
      enum: [challengeDirective.axis],
      type: "string",
    };
    schema.required.push("challengeAxis", "challengeAnchorKey");
  }
  return schema;
}

const evaluationJsonSchema = {
  additionalProperties: false,
  properties: {
    accuracyScore: { maximum: 100, minimum: 0, type: "integer" },
    clarityScore: { maximum: 100, minimum: 0, type: "integer" },
    confidenceScore: { maximum: 100, minimum: 0, type: "integer" },
    improvements: { items: { minLength: 1, type: "string" }, type: "array" },
    nextStep: { minLength: 1, type: "string" },
    overallScore: { maximum: 100, minimum: 0, type: "integer" },
    strengths: { items: { minLength: 1, type: "string" }, type: "array" },
  },
  required: [
    "overallScore",
    "accuracyScore",
    "clarityScore",
    "confidenceScore",
    "strengths",
    "improvements",
    "nextStep",
  ],
  type: "object",
};

const jobTargetAnalysisJsonSchema = {
  additionalProperties: false,
  properties: {
    requirements: {
      items: {
        additionalProperties: false,
        properties: {
          evidenceTerms: {
            items: { minLength: 2, type: "string" },
            maxItems: 5,
            type: "array",
          },
          key: { minLength: 2, type: "string" },
          label: { minLength: 2, type: "string" },
          priority: {
            enum: ["required", "preferred", "context"],
            type: "string",
          },
        },
        required: ["key", "label", "priority", "evidenceTerms"],
        type: "object",
      },
      maxItems: 12,
      minItems: 1,
      type: "array",
    },
    roleSummary: { minLength: 20, type: "string" },
    skills: {
      items: {
        additionalProperties: false,
        properties: {
          key: { minLength: 2, type: "string" },
          label: { minLength: 2, type: "string" },
          sourceRequirementKeys: {
            items: { minLength: 2, type: "string" },
            maxItems: 5,
            minItems: 1,
            type: "array",
          },
          weight: { maximum: 5, minimum: 1, type: "integer" },
        },
        required: ["key", "label", "weight", "sourceRequirementKeys"],
        type: "object",
      },
      maxItems: 12,
      minItems: 1,
      type: "array",
    },
  },
  required: ["roleSummary", "requirements", "skills"],
  type: "object",
};

const projectStringList = (minItems, maxItems, minLength, maxLength) => ({
  items: { maxLength, minLength, type: "string" },
  maxItems,
  minItems,
  type: "array",
});

const projectExtractionJsonSchema = {
  additionalProperties: false,
  properties: {
    drafts: {
      items: {
        additionalProperties: false,
        properties: {
          architecture: projectStringList(1, 10, 5, 300),
          claims: {
            items: {
              additionalProperties: false,
              properties: {
                evidence: {
                  maxLength: 300,
                  minLength: 5,
                  nullable: true,
                  type: "string",
                },
                text: { maxLength: 300, minLength: 5, type: "string" },
              },
              required: ["text", "evidence"],
              type: "object",
            },
            maxItems: 8,
            type: "array",
          },
          decisions: projectStringList(0, 8, 5, 300),
          name: { maxLength: 120, minLength: 2, type: "string" },
          responsibilities: projectStringList(1, 10, 5, 300),
          role: { maxLength: 120, minLength: 2, type: "string" },
          summary: { maxLength: 1000, minLength: 20, type: "string" },
          technologies: projectStringList(1, 15, 1, 50),
          tradeoffs: projectStringList(0, 8, 5, 300),
        },
        required: [
          "name",
          "summary",
          "role",
          "technologies",
          "responsibilities",
          "architecture",
          "decisions",
          "tradeoffs",
          "claims",
        ],
        type: "object",
      },
      maxItems: 5,
      type: "array",
    },
  },
  required: ["drafts"],
  type: "object",
};

function quotedList(items) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

export function buildQuestionPrompt({
  interviewType,
  level,
  previousQuestions,
  resumeContext,
}) {
  return [
    "Generate exactly one interview-practice question.",
    `Interview type: ${interviewType}`,
    `Level: ${level}`,
    "Avoid repeating these prior questions:",
    quotedList(previousQuestions),
    resumeContext
      ? [
          `Bounded resume context:\n${resumeContext}`,
          "Meaningfully tailor the question using at least one relevant non-personal technical skill, technology, or project detail from this context.",
          "Use only details explicitly present in the context; do not invent experience.",
          "Do not reveal names, contact details, or other personal data.",
        ].join("\n")
      : null,
    'Return JSON only. It must match this shape: {"prompt": "question text"}.',
    "Do not include an answer, scoring, hiring advice, markdown, or extra fields.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildAdaptiveQuestionPrompt(input) {
  return [
    "Propose exactly one bounded interview-practice question.",
    `Validated session context:\n${JSON.stringify(input)}`,
    "Use only listed topics, skills, history, and confirmed context.",
    input.challengeDirective
      ? `Challenge axis and anchor key must exactly match the directive. The prompt must visibly include this exact confirmed anchor text: ${input.challengeDirective.anchorText}`
      : "Do not return challengeAxis or challengeAnchorKey.",
    "Return one exact JSON decision. Do not include markdown, hidden reasoning, hiring advice, personal data, tools, or extra fields.",
  ].join("\n\n");
}

export function buildEvaluationPrompt({
  answer,
  interviewType,
  level,
  question,
}) {
  return [
    "Evaluate this interview-practice answer. This is not a hiring decision.",
    `Interview type: ${interviewType}`,
    `Level: ${level}`,
    `Question:\n${question}`,
    `Answer:\n${answer}`,
    "Return JSON only with integer scores from 0 to 100, 1-3 strengths, 1-3 improvements, and one next step.",
    "Do not include markdown, extra fields, personal data, or hiring advice.",
  ].join("\n\n");
}

export function buildJobTargetAnalysisPrompt({ company, description, title }) {
  return [
    "Analyze this job description for interview practice. This is not hiring advice.",
    `Role title: ${title}`,
    company ? `Company: ${company}` : null,
    `Job description:\n${description}`,
    "Return 1-12 explicit requirements and 1-12 skills grounded only in this description.",
    "Use unique lowercase hyphenated keys. Every skill must reference 1-5 returned requirement keys.",
    "Priorities: required, preferred, or context. Skill weights: integers 1-5.",
    "Return JSON only. Do not include markdown, personal data, hidden reasoning, hiring predictions, or extra fields.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildProjectExtractionPrompt({ resumeContext }) {
  return [
    "Extract up to five candidate project suggestions from this bounded resume context.",
    `Resume context:\n${resumeContext}`,
    "Use only facts explicitly present. Do not infer metrics, ownership, architecture, decisions, or trade-offs.",
    "If a required field is not supported, omit that project by returning fewer drafts, including zero.",
    "Claims need explicit resume evidence; otherwise return an empty claims list.",
    "Return JSON only with a drafts array. Do not include personal data, markdown, hidden reasoning, or extra fields.",
  ].join("\n\n");
}

export function createGeminiProvider({
  geminiApiKey,
  generateContent,
  model,
  timeoutMs,
}) {
  const client = generateContent
    ? null
    : new GoogleGenAI({ apiKey: geminiApiKey });
  const requestContent =
    generateContent || ((request) => client.models.generateContent(request));

  return {
    async generateAdaptiveQuestion(
      input,
      { timeoutMs: attemptTimeoutMs = timeoutMs } = {},
    ) {
      const response = await requestContent({
        config: {
          abortSignal: AbortSignal.timeout(attemptTimeoutMs),
          candidateCount: 1,
          maxOutputTokens: 500,
          responseJsonSchema: adaptiveQuestionJsonSchema(input),
          responseMimeType: "application/json",
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 },
        },
        contents: buildAdaptiveQuestionPrompt(input),
        model,
      });
      if (typeof response?.text !== "string") return null;
      try {
        return JSON.parse(response.text);
      } catch {
        return null;
      }
    },

    async analyzeJobTarget(
      input,
      { timeoutMs: attemptTimeoutMs = timeoutMs } = {},
    ) {
      const response = await requestContent({
        config: {
          abortSignal: AbortSignal.timeout(attemptTimeoutMs),
          candidateCount: 1,
          maxOutputTokens: 1600,
          responseJsonSchema: jobTargetAnalysisJsonSchema,
          responseMimeType: "application/json",
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 },
        },
        contents: buildJobTargetAnalysisPrompt(input),
        model,
      });

      if (typeof response?.text !== "string") return null;
      try {
        return JSON.parse(response.text);
      } catch {
        return null;
      }
    },

    async extractProjectDrafts(
      input,
      { timeoutMs: attemptTimeoutMs = timeoutMs } = {},
    ) {
      const response = await requestContent({
        config: {
          abortSignal: AbortSignal.timeout(attemptTimeoutMs),
          candidateCount: 1,
          maxOutputTokens: 3000,
          responseJsonSchema: projectExtractionJsonSchema,
          responseMimeType: "application/json",
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 },
        },
        contents: buildProjectExtractionPrompt(input),
        model,
      });
      if (typeof response?.text !== "string") return null;
      try {
        return JSON.parse(response.text);
      } catch {
        return null;
      }
    },

    async generateQuestion(
      input,
      { timeoutMs: attemptTimeoutMs = timeoutMs } = {},
    ) {
      const response = await requestContent({
        config: {
          abortSignal: AbortSignal.timeout(attemptTimeoutMs),
          candidateCount: 1,
          maxOutputTokens: 240,
          responseJsonSchema: questionJsonSchema,
          responseMimeType: "application/json",
          temperature: 0.2,
          thinkingConfig: { thinkingBudget: 0 },
        },
        contents: buildQuestionPrompt(input),
        model,
      });

      if (typeof response?.text !== "string") {
        return null;
      }

      try {
        return JSON.parse(response.text);
      } catch {
        return null;
      }
    },

    async evaluateAnswer(
      input,
      { timeoutMs: attemptTimeoutMs = timeoutMs } = {},
    ) {
      const response = await requestContent({
        config: {
          abortSignal: AbortSignal.timeout(attemptTimeoutMs),
          candidateCount: 1,
          maxOutputTokens: 600,
          responseJsonSchema: evaluationJsonSchema,
          responseMimeType: "application/json",
          temperature: 0.2,
          thinkingConfig: { thinkingBudget: 0 },
        },
        contents: buildEvaluationPrompt(input),
        model,
      });

      if (typeof response?.text !== "string") {
        return null;
      }

      try {
        return JSON.parse(response.text);
      } catch {
        return null;
      }
    },
  };
}
