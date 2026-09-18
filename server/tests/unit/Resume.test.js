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
      new Resume(validResume({ storage: { key: "file.pdf" } })).validate(),
    ).rejects.toThrow();
    await expect(
      new Resume(validResume({ userId: undefined })).validate(),
    ).rejects.toThrow();
  });

  it("declares user history index", () => {
    expect(Resume.schema.indexes()).toContainEqual([
      { createdAt: -1, userId: 1 },
      {},
    ]);
  });
});
