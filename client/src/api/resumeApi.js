import { apiRequest } from "./httpClient.js";

export const maxResumeSizeBytes = 5 * 1024 * 1024;

const allowedExtractionStatuses = new Set(["pending", "completed", "failed"]);

export function isSafeResumeMetadata(resume) {
  return Boolean(
    resume &&
    typeof resume.id === "string" &&
    resume.id.length > 0 &&
    typeof resume.originalName === "string" &&
    resume.originalName.trim().length > 0 &&
    resume.originalName.length <= 255 &&
    resume.mimeType === "application/pdf" &&
    Number.isInteger(resume.sizeBytes) &&
    resume.sizeBytes >= 1 &&
    resume.sizeBytes <= maxResumeSizeBytes &&
    allowedExtractionStatuses.has(resume.extractionStatus) &&
    typeof resume.createdAt === "string" &&
    !Number.isNaN(Date.parse(resume.createdAt)),
  );
}

export async function listResumes({ signal } = {}) {
  const result = await apiRequest("resumes", { signal });

  if (
    !Array.isArray(result?.resumes) ||
    result.resumes.length > 100 ||
    !result.resumes.every(isSafeResumeMetadata)
  ) {
    throw new Error("Resume list could not be loaded. Please try again.");
  }

  return result.resumes;
}

export async function uploadResume(file) {
  const formData = new FormData();
  formData.append("resume", file);
  const result = await apiRequest("resumes", {
    body: formData,
    method: "POST",
    timeoutMs: 10_000,
  });

  if (!isSafeResumeMetadata(result?.resume)) {
    throw new Error("Resume upload returned an unexpected response.");
  }

  return result.resume;
}
