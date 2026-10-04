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
  it("keeps V1 context at 2,000 characters and project context at 8,000", async () => {
    const lean = vi
      .fn()
      .mockResolvedValue({ extractedText: `  ${"word ".repeat(3000)}  ` });
    const select = vi.fn().mockReturnValue({ lean });
    const findOne = vi.fn().mockReturnValue({ select });
    const resumeService = createResumeService({ resumeModel: { findOne } });

    const input = { resumeId: "507f1f77bcf86cd799439011", userId: "owner-1" };
    await expect(
      resumeService.getOwnedResumeContext(input),
    ).resolves.toHaveLength(2000);
    await expect(
      resumeService.getOwnedResumeProjectContext(input),
    ).resolves.toHaveLength(8000);
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: input.resumeId,
        extractionStatus: "completed",
        userId: input.userId,
      }),
    );
  });

  it("queries an owned bounded newest-first metadata list", async () => {
    const lean = vi.fn().mockResolvedValue([
      {
        _id: { toString: () => "resume-1" },
        createdAt: new Date("2026-09-21T00:00:00.000Z"),
        extractionStatus: "completed",
        mimeType: "application/pdf",
        originalName: "resume.pdf",
        sizeBytes: 123,
      },
    ]);
    const limit = vi.fn().mockReturnValue({ lean });
    const sort = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ sort });
    const find = vi.fn().mockReturnValue({ select });
    const resumeService = createResumeService({ resumeModel: { find } });

    await expect(
      resumeService.listOwnedResumes({ userId: "owner-1" }),
    ).resolves.toEqual([
      {
        createdAt: "2026-09-21T00:00:00.000Z",
        extractionStatus: "completed",
        id: "resume-1",
        mimeType: "application/pdf",
        originalName: "resume.pdf",
        sizeBytes: 123,
      },
    ]);
    expect(find).toHaveBeenCalledWith({ userId: "owner-1" });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(limit).toHaveBeenCalledWith(100);
  });

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
