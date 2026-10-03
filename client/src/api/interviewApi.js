import { apiRequest } from "./httpClient.js";

const audioExtensionByMimeType = {
  "audio/mp4": "mp4",
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/webm": "webm",
};

function normalizedAudioMimeType(value = "") {
  return value.toLowerCase().split(";", 1)[0].trim();
}

function isExactObject(value, keys) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function isScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

function isFeedbackList(value) {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 3 &&
    value.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length >= 1 &&
        item.length <= 500,
    )
  );
}

function isVoiceAnswerResult(result) {
  return Boolean(
    isExactObject(result, ["answer", "feedback"]) &&
    isExactObject(result.answer, ["id", "inputMode", "submittedAt", "text"]) &&
    result.answer.id &&
    result.answer.inputMode === "voice" &&
    typeof result.answer.submittedAt === "string" &&
    !Number.isNaN(Date.parse(result.answer.submittedAt)) &&
    typeof result.answer.text === "string" &&
    result.answer.text.trim() &&
    result.answer.text.length <= 10_000 &&
    isExactObject(result.feedback, [
      "accuracyScore",
      "clarityScore",
      "confidenceScore",
      "improvements",
      "nextStep",
      "overallScore",
      "strengths",
    ]) &&
    isScore(result.feedback.accuracyScore) &&
    isScore(result.feedback.clarityScore) &&
    isScore(result.feedback.confidenceScore) &&
    isScore(result.feedback.overallScore) &&
    isFeedbackList(result.feedback.improvements) &&
    isFeedbackList(result.feedback.strengths) &&
    typeof result.feedback.nextStep === "string" &&
    result.feedback.nextStep.trim() &&
    result.feedback.nextStep.length <= 1_000,
  );
}

export function startInterview({
  idempotencyKey,
  interviewType,
  level,
  resumeId,
} = {}) {
  return apiRequest("interviews", {
    body: {
      idempotencyKey,
      interviewType,
      level,
      ...(resumeId ? { resumeId } : {}),
    },
    method: "POST",
    timeoutMs: 25_000,
  });
}

export function submitTextAnswer({
  idempotencyKey,
  interviewId,
  questionId,
  text,
} = {}) {
  return apiRequest(`interviews/${interviewId}/answers`, {
    body: { idempotencyKey, questionId, text },
    method: "POST",
    timeoutMs: 25_000,
  });
}

export async function submitVoiceAnswer({
  audioBlob,
  idempotencyKey,
  interviewId,
  questionId,
  signal,
} = {}) {
  const mimeType = normalizedAudioMimeType(audioBlob?.type);
  const extension = audioExtensionByMimeType[mimeType];

  if (!(audioBlob instanceof Blob) || !audioBlob.size || !extension) {
    throw new Error("Choose a supported non-empty voice recording.");
  }

  const body = new FormData();
  body.append("questionId", questionId || "");
  body.append("idempotencyKey", idempotencyKey || "");
  body.append("audio", audioBlob, `answer.${extension}`);
  const result = await apiRequest(`interviews/${interviewId}/voice-answers`, {
    body,
    method: "POST",
    signal,
    timeoutMs: 20_000,
  });

  if (!isVoiceAnswerResult(result)) {
    throw new Error("Voice answer returned an unexpected response.");
  }

  return {
    answer: { ...result.answer, text: result.answer.text.trim() },
    feedback: result.feedback,
  };
}

export function generateNextQuestion({ idempotencyKey, interviewId } = {}) {
  return apiRequest(`interviews/${interviewId}/questions`, {
    body: { idempotencyKey },
    method: "POST",
    timeoutMs: 25_000,
  });
}

export function getInterview({ interviewId, signal } = {}) {
  return apiRequest(`interviews/${interviewId}`, { signal });
}

export function completeInterview({ interviewId } = {}) {
  return apiRequest(`interviews/${interviewId}/complete`, {
    method: "POST",
  });
}
