import { apiRequest } from "./httpClient.js";

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
  });
}

export function generateNextQuestion({ idempotencyKey, interviewId } = {}) {
  return apiRequest(`interviews/${interviewId}/questions`, {
    body: { idempotencyKey },
    method: "POST",
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
