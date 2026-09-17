import { apiRequest } from "./httpClient.js";

export function startInterview({ interviewType, level, resumeId } = {}) {
  return apiRequest("interviews", {
    body: {
      interviewType,
      level,
      ...(resumeId ? { resumeId } : {}),
    },
    method: "POST",
  });
}

export function submitTextAnswer({ interviewId, questionId, text } = {}) {
  return apiRequest(`interviews/${interviewId}/answers`, {
    body: { questionId, text },
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
