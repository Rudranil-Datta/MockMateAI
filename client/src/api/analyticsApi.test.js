import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAnalyticsSummary, isSafeAnalyticsSummary } from "./analyticsApi.js";

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock("./httpClient.js", () => ({ apiRequest }));

const populatedAnalytics = {
  recentSessions: [
    {
      completedAt: "2026-09-23T12:00:00.000Z",
      id: "68d28d4fe533c5c96697b002",
      interviewType: "HR",
      level: "intermediate",
      overallScore: 84,
    },
    {
      completedAt: "2026-09-22T12:00:00.000Z",
      id: "68d13bcfe533c5c96697b001",
      interviewType: "DSA",
      level: "advanced",
      overallScore: 76,
    },
  ],
  summary: {
    averageAccuracyScore: 82,
    averageClarityScore: 77,
    averageConfidenceScore: 79,
    averageOverallScore: 80,
    completedSessions: 2,
  },
  trend: [
    { completedAt: "2026-09-22T12:00:00.000Z", overallScore: 76 },
    { completedAt: "2026-09-23T12:00:00.000Z", overallScore: 84 },
  ],
  typeAverages: [
    { averageOverallScore: 76, interviewType: "DSA" },
    { averageOverallScore: 84, interviewType: "HR" },
  ],
};

const emptyAnalytics = {
  recentSessions: [],
  summary: {
    averageAccuracyScore: 0,
    averageClarityScore: 0,
    averageConfidenceScore: 0,
    averageOverallScore: 0,
    completedSessions: 0,
  },
  trend: [],
  typeAverages: [],
};

describe("analyticsApi", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("loads a validated populated analytics response", async () => {
    apiRequest.mockResolvedValue(populatedAnalytics);

    await expect(getAnalyticsSummary()).resolves.toEqual(populatedAnalytics);
    expect(apiRequest).toHaveBeenCalledWith("analytics/summary", {
      signal: undefined,
    });
  });

  it("accepts the exact empty analytics response", () => {
    expect(isSafeAnalyticsSummary(emptyAnalytics)).toBe(true);
  });

  it("accepts a supported type subset in documented order", () => {
    expect(
      isSafeAnalyticsSummary({
        ...populatedAnalytics,
        typeAverages: [{ averageOverallScore: 84, interviewType: "HR" }],
      }),
    ).toBe(true);
  });

  it.each([
    ["private root field", { ...populatedAnalytics, userId: "private" }],
    [
      "private session field",
      {
        ...populatedAnalytics,
        recentSessions: [
          { ...populatedAnalytics.recentSessions[0], answer: "private" },
          populatedAnalytics.recentSessions[1],
        ],
      },
    ],
    [
      "invalid score",
      {
        ...populatedAnalytics,
        summary: { ...populatedAnalytics.summary, averageOverallScore: 101 },
      },
    ],
    [
      "unsupported type",
      {
        ...populatedAnalytics,
        typeAverages: [
          { averageOverallScore: 80, interviewType: "Behavioral" },
        ],
      },
    ],
    [
      "reordered history",
      {
        ...populatedAnalytics,
        recentSessions: [...populatedAnalytics.recentSessions].reverse(),
      },
    ],
    [
      "oversized history",
      {
        ...populatedAnalytics,
        recentSessions: Array.from({ length: 11 }, (_, index) => ({
          ...populatedAnalytics.recentSessions[0],
          completedAt: new Date(Date.UTC(2026, 8, 23 - index)).toISOString(),
          id: index.toString(16).padStart(24, "0"),
        })),
      },
    ],
    [
      "trend mismatch",
      {
        ...populatedAnalytics,
        trend: [
          { completedAt: "2026-09-22T12:00:00.000Z", overallScore: 75 },
          populatedAnalytics.trend[1],
        ],
      },
    ],
    [
      "invalid empty relation",
      {
        ...emptyAnalytics,
        recentSessions: [populatedAnalytics.recentSessions[0]],
        trend: [populatedAnalytics.trend[1]],
      },
    ],
  ])("rejects %s", async (_label, malformedAnalytics) => {
    apiRequest.mockResolvedValue(malformedAnalytics);

    await expect(getAnalyticsSummary()).rejects.toThrow(
      "Dashboard data could not be loaded. Please try again.",
    );
  });
});
