import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  isSafeResumeMetadata,
  listResumes,
  maxResumeSizeBytes,
  uploadResume,
} from "./resumeApi.js";

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock("./httpClient.js", () => ({ apiRequest }));

const resume = {
  createdAt: "2026-09-21T00:00:00.000Z",
  extractionStatus: "completed",
  id: "resume-1",
  mimeType: "application/pdf",
  originalName: "resume.pdf",
  sizeBytes: 1024,
};

describe("resumeApi", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("loads validated safe resume metadata", async () => {
    apiRequest.mockResolvedValue({ resumes: [resume] });

    await expect(listResumes()).resolves.toEqual([resume]);
    expect(apiRequest).toHaveBeenCalledWith("resumes", { signal: undefined });
  });

  it.each([
    { ...resume, extractionStatus: "unknown" },
    { ...resume, sizeBytes: maxResumeSizeBytes + 1 },
    { ...resume, createdAt: "invalid" },
    { ...resume, storage: { key: "private.pdf" }, id: "" },
  ])("rejects malformed list metadata", async (invalidResume) => {
    apiRequest.mockResolvedValue({ resumes: [invalidResume] });

    await expect(listResumes()).rejects.toThrow(/could not be loaded/);
  });

  it("uploads one PDF using multipart data", async () => {
    apiRequest.mockResolvedValue({ resume });
    const file = new File(["%PDF-1.7"], "resume.pdf", {
      type: "application/pdf",
    });

    await expect(uploadResume(file)).resolves.toEqual(resume);
    const [, options] = apiRequest.mock.calls[0];
    expect(apiRequest).toHaveBeenCalledWith(
      "resumes",
      expect.objectContaining({ method: "POST", timeoutMs: 10_000 }),
    );
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("resume")).toBe(file);
  });

  it("rejects malformed upload metadata", async () => {
    apiRequest.mockResolvedValue({
      resume: { ...resume, mimeType: "text/plain" },
    });

    await expect(uploadResume(new File(["x"], "resume.pdf"))).rejects.toThrow(
      /unexpected response/,
    );
  });

  it("accepts only documented metadata bounds", () => {
    expect(isSafeResumeMetadata(resume)).toBe(true);
    expect(isSafeResumeMetadata({ ...resume, originalName: "" })).toBe(false);
  });
});
