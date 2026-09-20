import { GoogleGenAI } from "@google/genai";

const questionJsonSchema = {
  additionalProperties: false,
  properties: {
    prompt: { minLength: 1, type: "string" },
  },
  required: ["prompt"],
  type: "object",
};

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
    resumeContext ? `Optional bounded resume context:\n${resumeContext}` : null,
    'Return JSON only. It must match this shape: {"prompt": "question text"}.',
    "Do not include an answer, scoring, hiring advice, markdown, or extra fields.",
  ]
    .filter(Boolean)
    .join("\n\n");
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
    async generateQuestion(input) {
      const response = await requestContent({
        config: {
          abortSignal: AbortSignal.timeout(timeoutMs),
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

    async evaluateAnswer(input) {
      const response = await requestContent({
        config: {
          abortSignal: AbortSignal.timeout(timeoutMs),
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
