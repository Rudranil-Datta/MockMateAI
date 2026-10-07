import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCoachTree } from "./coachTreeApi.js";

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock("./httpClient.js", () => ({ apiRequest }));

const validTree = {
  context: { kind: "overall", label: "Overall preparation" },
  edges: [{ from: "context", to: "branch:overall" }, { from: "branch:overall", to: "skill:node-js" }],
  evidenceSyncStatus: "ready",
  nodes: [
    { id: "context", kind: "context", label: "Overall preparation" },
    { id: "branch:overall", kind: "branch", label: "Overall skill evidence" },
    { confidence: "provisional", evidenceCount: 1, id: "skill:node-js", kind: "skill", label: "Node.js", masteryLabel: "needs_work", masteryScore: 30, replayTo: "/practice/507f1f77bcf86cd799439011/results", skillKey: "node-js", skillLabel: "Node.js" },
  ],
  omittedSkillCount: 0,
};

describe("getCoachTree", () => {
  beforeEach(() => apiRequest.mockReset());

  it("requests and accepts bounded safe tree", async () => {
    apiRequest.mockResolvedValue(validTree);
    await expect(getCoachTree()).resolves.toEqual(validTree);
    expect(apiRequest).toHaveBeenCalledWith("coach/tree?context=overall", { signal: undefined });
  });

  it("rejects unsafe graph edges and unsafe replay links", async () => {
    apiRequest.mockResolvedValue({ ...validTree, edges: [{ from: "context", to: "skill:node-js" }] });
    await expect(getCoachTree()).rejects.toMatchObject({ code: "COACH_MALFORMED_RESPONSE" });
    apiRequest.mockResolvedValue({ ...validTree, nodes: [...validTree.nodes.slice(0, 2), { ...validTree.nodes[2], replayTo: "https://unsafe.example/results" }] });
    await expect(getCoachTree()).rejects.toMatchObject({ code: "COACH_MALFORMED_RESPONSE" });
  });
});
