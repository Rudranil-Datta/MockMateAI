import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createProject,
  createPartialProject,
  deleteProject,
  extractProjectDrafts,
  getProject,
  importReadmeDraft,
  listProjects,
  updateProject,
  updatePartialProject,
} from "./projectApi.js";

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock("./httpClient.js", () => ({ apiRequest }));

const facts = {
  architecture: ["React client with an Express API"],
  claims: [],
  decisions: [],
  name: "MockMateAI",
  responsibilities: ["Built and tested the interview workflow"],
  role: "Full-stack developer",
  summary: "An interview preparation application with structured feedback.",
  technologies: ["React", "Node.js"],
  tradeoffs: [],
};
const project = {
  ...facts,
  confirmedAt: "2026-10-04T00:00:00.000Z",
  createdAt: "2026-10-04T00:00:00.000Z",
  id: "project-1",
  updatedAt: "2026-10-04T00:00:00.000Z",
};
const draft = {
  ...facts,
  source: "resume_suggestion",
  sourceResumeId: "resume-1",
};
const partialDraft = {
  architecture: [],
  claims: [],
  decisions: [],
  missingFields: [
    "name",
    "role",
    "responsibilities",
    "architecture",
    "decisions",
    "tradeoffs",
    "claims",
  ],
  name: null,
  responsibilities: [],
  role: null,
  source: "resume_suggestion",
  sourceResumeId: "resume-1",
  summary: "Built a React interview practice application.",
  technologies: ["React"],
  tradeoffs: [],
};
const {
  missingFields: _missingFields,
  source: _source,
  ...partialFacts
} = partialDraft;
const partialProject = {
  ...partialFacts,
  createdAt: "2026-10-11T00:00:00.000Z",
  id: "partial-project-1",
  partialConfirmedAt: "2026-10-11T00:00:00.000Z",
  status: "partial",
  updatedAt: "2026-10-11T00:00:00.000Z",
};
const readmeDraft = {
  ...facts,
  source: "readme_import",
};
const readmeReview = {
  missingFields: [],
  omittedLineCount: 0,
  recognizedSections: ["name"],
  unmatchedText: "",
};

describe("projectApi", () => {
  beforeEach(() => apiRequest.mockReset());

  it("maps extraction and validates unconfirmed draft output", async () => {
    apiRequest.mockResolvedValue({ drafts: [draft] });
    await expect(
      extractProjectDrafts({ idempotencyKey: "key", resumeId: "resume-1" }),
    ).resolves.toEqual([draft]);
    expect(apiRequest).toHaveBeenCalledWith(
      "projects/extract",
      expect.objectContaining({
        body: { idempotencyKey: "key", resumeId: "resume-1" },
        method: "POST",
      }),
    );
  });

  it("accepts bounded source-backed partial draft output", async () => {
    apiRequest.mockResolvedValue({ drafts: [partialDraft] });
    await expect(
      extractProjectDrafts({ idempotencyKey: "key", resumeId: "resume-1" }),
    ).resolves.toEqual([partialDraft]);
  });

  it("forwards cancellation to extraction", async () => {
    apiRequest.mockResolvedValue({ drafts: [] });
    const signal = new AbortController().signal;
    await extractProjectDrafts({
      idempotencyKey: "key",
      resumeId: "resume-1",
      signal,
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "projects/extract",
      expect.objectContaining({ signal, timeoutMs: 25_000 }),
    );
  });

  it("validates bounded transient README draft output", async () => {
    apiRequest.mockResolvedValue({ draft: readmeDraft, review: readmeReview });
    const file = new File(["# MockMateAI"], "README.md", {
      type: "text/markdown",
    });
    await expect(importReadmeDraft(file)).resolves.toEqual({
      draft: readmeDraft,
      review: readmeReview,
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "projects/readme-draft",
      expect.objectContaining({ method: "POST", timeoutMs: 12_000 }),
    );

    apiRequest.mockResolvedValue({
      draft: { ...readmeDraft, responsibilities: ["bad"] },
      review: readmeReview,
    });
    await expect(importReadmeDraft(file)).rejects.toThrow(/unexpected/);

    apiRequest.mockResolvedValue({
      draft: readmeDraft,
      review: { ...readmeReview, missingFields: ["not-a-project-field"] },
    });
    await expect(importReadmeDraft(file)).rejects.toThrow(/unexpected/);
  });

  it("maps list, read, create, update, and delete contracts", async () => {
    apiRequest
      .mockResolvedValueOnce({ items: [project] })
      .mockResolvedValueOnce({ project })
      .mockResolvedValueOnce({ project })
      .mockResolvedValueOnce({ project })
      .mockResolvedValueOnce(undefined);
    await expect(listProjects()).resolves.toEqual([project]);
    await expect(getProject("project-1")).resolves.toEqual(project);
    await expect(createProject(facts)).resolves.toEqual(project);
    await expect(updateProject("project-1", facts)).resolves.toEqual(project);
    await expect(deleteProject("project-1")).resolves.toBeUndefined();
    expect(apiRequest.mock.calls[2][1].body.confirmed).toBe(true);
    expect(apiRequest.mock.calls[3][1].body.confirmed).toBe(true);
  });

  it("accepts legacy short and new long persisted project facts", async () => {
    const legacyFact = "x".repeat(5);
    const longFact = "y".repeat(600);
    const legacyProject = {
      ...project,
      architecture: [legacyFact],
      responsibilities: [legacyFact],
    };
    const longProject = {
      ...project,
      architecture: [longFact],
      claims: [{ evidence: longFact, text: longFact }],
      decisions: [longFact],
      responsibilities: [longFact],
      tradeoffs: [longFact],
    };
    apiRequest.mockResolvedValue({ items: [legacyProject, longProject] });

    await expect(listProjects()).resolves.toEqual([legacyProject, longProject]);
  });

  it("accepts persisted partial projects across save, list, read, and edit", async () => {
    apiRequest
      .mockResolvedValueOnce({ project: partialProject })
      .mockResolvedValueOnce({ items: [partialProject] })
      .mockResolvedValueOnce({ project: partialProject })
      .mockResolvedValueOnce({ project: partialProject });

    await expect(createPartialProject(partialDraft)).resolves.toEqual(
      partialProject,
    );
    await expect(listProjects()).resolves.toEqual([partialProject]);
    await expect(getProject(partialProject.id)).resolves.toEqual(
      partialProject,
    );
    await expect(
      updatePartialProject(partialProject.id, partialDraft),
    ).resolves.toEqual(partialProject);
    expect(apiRequest.mock.calls[0][1]).toMatchObject({
      body: expect.objectContaining({ partialConfirmed: true }),
      method: "POST",
    });
    expect(apiRequest.mock.calls[3][1]).toMatchObject({
      body: expect.objectContaining({ partialConfirmed: true }),
      method: "PATCH",
    });
  });

  it.each([
    { drafts: [{ ...draft, source: "provider_fact" }] },
    { drafts: [{ ...draft, extra: true }] },
    { drafts: [{ ...partialDraft, missingFields: ["name"] }] },
    { drafts: [{ ...draft, technologies: ["React", "react"] }] },
    {
      drafts: [
        {
          ...draft,
          claims: [
            { evidence: null, text: "Improved system reliability" },
            { evidence: null, text: "improved system reliability" },
          ],
        },
      ],
    },
  ])("rejects malformed draft responses", async (response) => {
    apiRequest.mockResolvedValue(response);
    await expect(
      extractProjectDrafts({ idempotencyKey: "key", resumeId: "resume-1" }),
    ).rejects.toThrow(/unexpected/);
  });

  it("rejects malformed persisted project responses", async () => {
    apiRequest.mockResolvedValue({
      items: [{ ...project, privatePrompt: "secret" }],
    });
    await expect(listProjects()).rejects.toThrow(/could not be loaded/);
  });
});
