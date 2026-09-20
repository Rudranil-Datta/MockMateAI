import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import Resume from "../../src/models/Resume.js";

function validResume(overrides = {}) {
  return {
    mimeType: "application/pdf",
    originalName: "Asha-Kumar-Resume.pdf",
    sizeBytes: 124000,
    storage: { key: "controlled-file-name.pdf", provider: "local" },
    userId: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

describe("Resume", () => {
  it("creates pending owned resume metadata", async () => {
    const resume = new Resume(validResume());

    await expect(resume.validate()).resolves.toBeUndefined();
    expect(resume.extractionStatus).toBe("pending");
  });

  it("rejects unsafe metadata", async () => {
    await expect(
      new Resume(validResume({ mimeType: "text/plain" })).validate(),
    ).rejects.toThrow();
    await expect(
      new Resume(validResume({ sizeBytes: 0 })).validate(),
    ).rejects.toThrow();
    await expect(
      new Resume(validResume({ sizeBytes: 5 * 1024 * 1024 + 1 })).validate(),
    ).rejects.toThrow();
    await expect(
      new Resume(validResume({ storage: { key: "file.pdf" } })).validate(),
    ).rejects.toThrow();
    await expect(
      new Resume(validResume({ userId: undefined })).validate(),
    ).rejects.toThrow();
  });

  it("requires text for completed extraction and a safe error for failure", async () => {
    await expect(
      new Resume(validResume({ extractionStatus: "completed" })).validate(),
    ).rejects.toThrow();
    await expect(
      new Resume(validResume({ extractionStatus: "failed" })).validate(),
    ).rejects.toThrow();
    await expect(
      new Resume(
        validResume({
          extractedText: "Backend Engineer",
          extractionStatus: "completed",
        }),
      ).validate(),
    ).resolves.toBeUndefined();
    await expect(
      new Resume(
        validResume({
          extractionError: "Resume text could not be extracted.",
          extractionStatus: "failed",
        }),
      ).validate(),
    ).resolves.toBeUndefined();
  });

  it("rejects extraction data outside its matching state", async () => {
    await expect(
      new Resume(
        validResume({ extractedText: "Private resume text" }),
      ).validate(),
    ).rejects.toThrow();
    await expect(
      new Resume(
        validResume({
          extractionError: "Safe failure.",
          extractionStatus: "completed",
          extractedText: "Backend Engineer",
        }),
      ).validate(),
    ).rejects.toThrow();
    await expect(
      new Resume(
        validResume({
          extractionError: "Safe failure.",
          extractedText: "Private resume text",
          extractionStatus: "failed",
        }),
      ).validate(),
    ).rejects.toThrow();
  });

  it("declares user history index", () => {
    expect(Resume.schema.indexes()).toContainEqual([
      { createdAt: -1, userId: 1 },
      {},
    ]);
  });
});
