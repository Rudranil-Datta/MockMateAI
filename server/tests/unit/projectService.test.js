import { describe, expect, it, vi } from "vitest";

import { createProjectService } from "../../src/services/projectService.js";

const draft = {
  architecture: ["Client and API architecture"],
  claims: [],
  decisions: [],
  name: "Project",
  responsibilities: ["Implemented the project workflow"],
  role: "Developer",
  summary: "A sufficiently detailed project summary for validation.",
  technologies: ["JavaScript"],
  tradeoffs: [],
};

function key(index) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

describe("project extraction service", () => {
  it("rejects a confirmed project whose complete snapshot exceeds 16 KiB", async () => {
    const longItems = Array.from(
      { length: 10 },
      (_, index) => `${index}-${"x".repeat(297)}`,
    );
    const project = {
      architecture: longItems,
      claims: Array.from({ length: 8 }, (_, index) => ({
        evidence: `${index}-${"e".repeat(297)}`,
        text: `${index}-${"c".repeat(297)}`,
      })),
      confirmedAt: new Date(),
      decisions: longItems.slice(0, 8),
      id: "507f1f77bcf86cd799439011",
      name: "Large Project",
      responsibilities: longItems,
      role: "Engineer",
      summary: "s".repeat(1000),
      technologies: ["JavaScript"],
      tradeoffs: longItems.slice(0, 8),
      updatedAt: new Date(),
      validate: vi.fn().mockResolvedValue(undefined),
    };
    const service = createProjectService({
      candidateProjectModel: { findOne: vi.fn().mockResolvedValue(project) },
    });

    await expect(
      service.getConfirmedProjectSnapshot({
        projectId: project.id,
        userId: "owner",
      }),
    ).rejects.toMatchObject({ code: "PROJECT_NOT_READY", status: 409 });
  });

  it("shares one in-flight operation and rejects changed input", async () => {
    let release;
    const provider = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const service = createProjectService({
      aiProviderService: { extractProjectDrafts: provider },
      resumeService: {
        getOwnedResumeProjectContext: vi
          .fn()
          .mockResolvedValue("resume context"),
      },
    });
    const input = {
      idempotencyKey: key(1),
      resumeId: "507f1f77bcf86cd799439011",
      userId: "owner",
    };
    const first = service.extractDrafts(input);
    const second = service.extractDrafts(input);
    await expect(
      service.extractDrafts({ ...input, resumeId: "507f1f77bcf86cd799439012" }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
    release({ drafts: [draft] });
    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.any(Array),
      expect.any(Array),
    ]);
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("expires results after 60 seconds", async () => {
    let currentTime = 0;
    const provider = vi.fn().mockResolvedValue({ drafts: [draft] });
    const service = createProjectService({
      aiProviderService: { extractProjectDrafts: provider },
      now: () => currentTime,
      resumeService: {
        getOwnedResumeProjectContext: vi
          .fn()
          .mockResolvedValue("resume context"),
      },
    });
    const input = {
      idempotencyKey: key(2),
      resumeId: "507f1f77bcf86cd799439011",
      userId: "owner",
    };
    await service.extractDrafts(input);
    currentTime = 59_999;
    await service.extractDrafts(input);
    currentTime = 60_000;
    await service.extractDrafts(input);
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("evicts the oldest entry at the 100-entry bound", async () => {
    const provider = vi.fn().mockResolvedValue({ drafts: [draft] });
    const service = createProjectService({
      aiProviderService: { extractProjectDrafts: provider },
      resumeService: {
        getOwnedResumeProjectContext: vi
          .fn()
          .mockResolvedValue("resume context"),
      },
    });
    const base = { resumeId: "507f1f77bcf86cd799439011", userId: "owner" };
    for (let index = 1; index <= 101; index += 1) {
      await service.extractDrafts({ ...base, idempotencyKey: key(index) });
    }
    await service.extractDrafts({ ...base, idempotencyKey: key(1) });
    expect(provider).toHaveBeenCalledTimes(102);
  });

  it("does not evict in-flight work when every bounded entry is pending", async () => {
    let release;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    const provider = vi.fn().mockReturnValue(pending);
    const service = createProjectService({
      aiProviderService: { extractProjectDrafts: provider },
      resumeService: {
        getOwnedResumeProjectContext: vi
          .fn()
          .mockResolvedValue("resume context"),
      },
    });
    const base = {
      resumeId: "507f1f77bcf86cd799439011",
      userId: "owner",
    };
    const operations = Array.from({ length: 100 }, (_, index) =>
      service.extractDrafts({ ...base, idempotencyKey: key(index + 1) }),
    );
    await expect(
      service.extractDrafts({ ...base, idempotencyKey: key(101) }),
    ).rejects.toMatchObject({ code: "PROJECT_EXTRACTION_BUSY", status: 409 });
    release({ drafts: [draft] });
    await Promise.all(operations);
    expect(provider).toHaveBeenCalledTimes(100);
  });
});
