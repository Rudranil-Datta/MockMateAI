import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createProject,
  deleteProject,
  extractProjectDrafts,
  getProject,
  listProjects,
  updateProject,
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
      expect.objectContaining({ signal, timeoutMs: 12_000 }),
    );
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

  it.each([
    { drafts: [{ ...draft, source: "provider_fact" }] },
    { drafts: [{ ...draft, extra: true }] },
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
