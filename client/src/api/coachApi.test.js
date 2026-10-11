import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCoachRoadmap } from "./coachApi.js";

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock("./httpClient.js", () => ({ apiRequest }));

const roadmap = {
  actions: [
    {
      description: "Collect evidence.",
      label: "Practice",
      to: "/practice",
      type: "collect_evidence",
    },
    {
      description: "Add context.",
      label: "Add target",
      to: "/targets",
      type: "add_context",
    },
    {
      description: "Confirm facts.",
      label: "Confirm project",
      to: "/projects",
      type: "confirm_project",
    },
  ],
  context: { kind: "overall", label: "Overall preparation" },
  evidenceSyncStatus: "ready",
  skills: [
    {
      confidence: "provisional",
      evidenceCount: 1,
      masteryLabel: "needs_work",
      masteryScore: 30,
      ranking: { priority: 1, reason: "overall_recommended" },
      skillKey: "node-js",
      skillLabel: "Node.js",
    },
  ],
};

describe("getCoachRoadmap", () => {
  beforeEach(() => apiRequest.mockReset());

  it("accepts bounded deterministic ranking", async () => {
    apiRequest.mockResolvedValue(roadmap);
    await expect(getCoachRoadmap()).resolves.toEqual(roadmap);
  });

  it("rejects missing, extra, or invalid ranking", async () => {
    for (const ranking of [
      undefined,
      { priority: 0, reason: "overall_recommended" },
      { priority: 1, reason: "unknown" },
      { priority: 1, reason: "overall_recommended", weight: 5 },
    ]) {
      const { ranking: _ranking, ...skillWithoutRanking } = roadmap.skills[0];
      apiRequest.mockResolvedValue({
        ...roadmap,
        skills: [
          ranking ? { ...roadmap.skills[0], ranking } : skillWithoutRanking,
        ],
      });
      await expect(getCoachRoadmap()).rejects.toMatchObject({
        code: "COACH_MALFORMED_RESPONSE",
      });
    }
  });
});
