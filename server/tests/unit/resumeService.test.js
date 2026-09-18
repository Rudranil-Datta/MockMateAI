import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createResumeService } from "../../src/services/resumeService.js";

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("resumeService", () => {
  it("removes stored upload when metadata persistence fails", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "mockmateai-resume-service-"),
    );
    temporaryDirectories.push(directory);
    const path = join(directory, "controlled.pdf");
    await writeFile(path, "%PDF-1.7\nresume");
    const persistenceFailure = new Error("Database unavailable");
    const resumeModel = {
      create: vi.fn().mockRejectedValue(persistenceFailure),
    };
    const resumeService = createResumeService({ resumeModel });

    await expect(
      resumeService.createResume({
        file: {
          filename: "controlled.pdf",
          mimetype: "application/pdf",
          originalname: "resume.pdf",
          path,
          size: 16,
        },
        userId: "507f1f77bcf86cd799439011",
      }),
    ).rejects.toBe(persistenceFailure);
    await expect(access(path)).rejects.toThrow();
  });
});
