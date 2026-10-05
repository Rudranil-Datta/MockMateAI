import { beforeEach, describe, expect, it, vi } from "vitest";

import { listJobTargets } from "./jobTargetApi.js";

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock("./httpClient.js", () => ({ apiRequest }));

const target = {
  analysis: {
    requirements: [
      {
        evidenceTerms: ["Node.js APIs"],
        key: "backend-apis",
        label: "Backend APIs",
        priority: "required",
      },
    ],
    roleSummary: "Build reliable backend services for customers.",
    skills: [
      {
        key: "node-js",
        label: "Node.js",
        sourceRequirementKeys: ["backend-apis"],
        weight: 5,
      },
    ],
  },
  company: "Example",
  createdAt: "2026-10-05T00:00:00.000Z",
  description: "Build secure Node.js APIs with reliable testing. ".repeat(3),
  id: "target-123",
  status: "ready",
  title: "Backend Engineer",
  updatedAt: "2026-10-05T00:00:00.000Z",
};

describe("jobTargetApi", () => {
  beforeEach(() => apiRequest.mockReset());

  it("returns a strictly validated owned target list", async () => {
    const controller = new AbortController();
    apiRequest.mockResolvedValue({ items: [target] });

    await expect(
      listJobTargets({ signal: controller.signal }),
    ).resolves.toEqual([target]);
    expect(apiRequest).toHaveBeenCalledWith("job-targets", {
      signal: controller.signal,
    });
  });

  it("rejects malformed target analysis", async () => {
    apiRequest.mockResolvedValue({
      items: [{ ...target, analysis: { ...target.analysis, skills: [] } }],
    });

    await expect(listJobTargets()).rejects.toThrow(
      "Job Targets could not be loaded",
    );
  });
});
