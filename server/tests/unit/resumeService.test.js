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

  it("keeps early, late, and headingless project material reachable", async () => {
    const lateProject =
      "Built late inventory platform using React and Node.js.";
    const headinglessProject = "Developed a service for deployment automation.";
    const lean = vi.fn().mockResolvedValue({
      extractedText: [
        "PROJECTS",
        "Built early payments API using TypeScript.",
        "Background summary ".repeat(700),
        "Experience",
        lateProject,
        "OTHER",
        headinglessProject,
      ].join("\n"),
    });
    const select = vi.fn().mockReturnValue({ lean });
    const findOne = vi.fn().mockReturnValue({ select });
    const resumeService = createResumeService({ resumeModel: { findOne } });

    const context = await resumeService.getOwnedResumeProjectContext({
      resumeId: "507f1f77bcf86cd799439011",
      userId: "owner-1",
    });

    expect(context).toContain("Built early payments API using TypeScript.");
    expect(context).toContain(lateProject);
    expect(context).toContain(headinglessProject);
    expect(context.length).toBeLessThanOrEqual(8000);
  });

  it("keeps uncued project body lines with their project heading", async () => {
    const body = "Users can create, edit, and revisit project records later.";
    const lean = vi.fn().mockResolvedValue({
      extractedText: [
        "PROJECTS",
        "MockMateAI",
        body,
        "Built with React and Node.js.",
        "SKILLS",
        "Communication",
      ].join("\n"),
    });
    const select = vi.fn().mockReturnValue({ lean });
    const findOne = vi.fn().mockReturnValue({ select });
    const resumeService = createResumeService({ resumeModel: { findOne } });

    await expect(
      resumeService.getOwnedResumeProjectContext({
        resumeId: "507f1f77bcf86cd799439011",
        userId: "owner-1",
      }),
    ).resolves.toContain(body);
  });

  it("keeps separate project entry bodies reachable within one Projects section", async () => {
    const entries = ["Atlas", "Beacon", "Cipher"].map(
      (name) => `${name}\nBuilt ${name} API with React and Node.js.`,
    );
    const lean = vi.fn().mockResolvedValue({
      extractedText: ["PROJECTS", ...entries].join("\n"),
    });
    const select = vi.fn().mockReturnValue({ lean });
    const findOne = vi.fn().mockReturnValue({ select });
    const resumeService = createResumeService({ resumeModel: { findOne } });

    const context = await resumeService.getOwnedResumeProjectContext({
      resumeId: "507f1f77bcf86cd799439011",
      userId: "owner-1",
    });
    entries.forEach((entry) => expect(context).toContain(entry));
  });

  it("keeps deterministic first five equally supported project entries", async () => {
    const names = ["Atlas", "Beacon", "Cipher", "Delta", "Ember", "Forge"];
    const lean = vi.fn().mockResolvedValue({
      extractedText: [
        "PROJECTS",
        ...names.flatMap((name) => [
          name,
          `Built ${name} API with React and Node.js.`,
        ]),
      ].join("\n"),
    });
    const select = vi.fn().mockReturnValue({ lean });
    const findOne = vi.fn().mockReturnValue({ select });
    const resumeService = createResumeService({ resumeModel: { findOne } });

    const context = await resumeService.getOwnedResumeProjectContext({
      resumeId: "507f1f77bcf86cd799439011",
      userId: "owner-1",
    });
    names.slice(0, 5).forEach((name) => expect(context).toContain(name));
    expect(context).not.toContain("Forge");
  });

  it("keeps equal-ranked excerpts in source order and excludes personal lines", async () => {
    const lean = vi.fn().mockResolvedValue({
      extractedText: [
        "Projects",
        "Built first API using React.",
        "Built second API using React.",
        "owner@example.com",
      ].join("\n"),
    });
    const select = vi.fn().mockReturnValue({ lean });
    const findOne = vi.fn().mockReturnValue({ select });
    const resumeService = createResumeService({ resumeModel: { findOne } });

    const context = await resumeService.getOwnedResumeProjectContext({
      resumeId: "507f1f77bcf86cd799439011",
      userId: "owner-1",
    });

    expect(context.indexOf("Built first API")).toBeLessThan(
      context.indexOf("Built second API"),
    );
    expect(context).not.toContain("owner@example.com");
  });

  it("uses a bounded non-personal fallback when no project cue exists", async () => {
    const fallback = "Coursework and volunteer activities are listed here.";
    const lean = vi.fn().mockResolvedValue({
      extractedText: [
        "owner@example.com",
        fallback,
        "References available.",
      ].join("\n"),
    });
    const select = vi.fn().mockReturnValue({ lean });
    const findOne = vi.fn().mockReturnValue({ select });
    const resumeService = createResumeService({ resumeModel: { findOne } });

    await expect(
      resumeService.getOwnedResumeProjectContext({
        resumeId: "507f1f77bcf86cd799439011",
        userId: "owner-1",
      }),
    ).resolves.toContain(`[Fallback excerpt]\n${fallback}`);
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
