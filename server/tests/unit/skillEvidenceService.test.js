import { describe, expect, it, vi } from "vitest";

import { createSkillEvidenceService } from "../../src/services/skillEvidenceService.js";

const now = new Date("2026-10-05T00:00:00.000Z");
const userId = "507f1f77bcf86cd799439011";

function evidence(overrides = {}) {
  return {
    createdAt: new Date("2026-10-04T00:00:00.000Z"),
    difficulty: "intermediate",
    evidenceStrength: "direct",
    outcome: "partial",
    sessionId: "507f1f77bcf86cd799439012",
    skillKey: "api-design",
    skillLabel: "API design",
    ...overrides,
  };
}

function serviceFor(items) {
  return createSkillEvidenceService({
    interviewSessionModel: {
      find: () => ({ sort: () => ({ limit: async () => [] }) }),
    },
    now: () => now,
    skillEvidenceModel: {
      find: () => ({ sort: () => ({ lean: async () => items }) }),
    },
  });
}

describe("skillEvidenceService", () => {
  it("derives fixed weighted profile and deterministic recommendation", async () => {
    const profile = await serviceFor([
      evidence({
        outcome: "strong",
        skillKey: "node-js",
        skillLabel: "Node.js",
      }),
      evidence({ outcome: "weak" }),
      evidence({
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        evidenceStrength: "supporting",
        outcome: "partial",
      }),
    ]).getProfile({ userId });

    expect(profile.evidenceSyncStatus).toBe("ready");
    expect(profile.skills.map(({ skillKey }) => skillKey)).toEqual([
      "api-design",
      "node-js",
    ]);
    expect(profile.skills[0]).toMatchObject({
      confidence: "provisional",
      evidenceCount: 2,
      masteryLabel: "developing",
      masteryScore: 42,
    });
    expect(profile.recommendedAction).toEqual({
      skillKey: "api-design",
      type: "targeted_practice",
    });
  });

  it("excludes expired evidence and returns an honest empty profile", async () => {
    const profile = await serviceFor([
      evidence({ createdAt: new Date("2026-03-01T00:00:00.000Z") }),
    ]).getProfile({ userId });
    expect(profile).toEqual({
      evidenceSyncStatus: "ready",
      recommendedAction: null,
      skills: [],
    });
  });

  it("reads pending evidence state without reconciliation writes", async () => {
    const exists = vi.fn().mockResolvedValue({ _id: "pending-session" });
    const updateOne = vi.fn();
    const bulkWrite = vi.fn();
    const service = createSkillEvidenceService({
      interviewSessionModel: { exists, updateOne },
      now: () => now,
      skillEvidenceModel: {
        bulkWrite,
        find: () => ({ sort: () => ({ lean: async () => [evidence()] }) }),
      },
    });

    await expect(service.getReadOnlyProfile({ userId })).resolves.toMatchObject(
      {
        evidenceSyncStatus: "pending",
        skills: [{ skillKey: "api-design" }],
      },
    );
    expect(exists).toHaveBeenCalledWith({
      evidenceSyncStatus: "pending",
      userId,
    });
    expect(bulkWrite).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("returns only an owned skill below the fixed weak threshold", async () => {
    const service = serviceFor([
      evidence({
        outcome: "strong",
        skillKey: "node-js",
        skillLabel: "Node.js",
      }),
    ]);

    await expect(
      service.getOwnedWeakSkill({ skillKey: "node-js", userId }),
    ).resolves.toBeUndefined();
  });

  it("derives a safe targeted retest comparison from immutable evidence", async () => {
    const sessionId = "507f1f77bcf86cd799439099";
    const service = createSkillEvidenceService({
      now: () => now,
      skillEvidenceModel: {
        find: () => ({
          sort: () => ({
            lean: async () => [
              evidence({
                createdAt: new Date("2026-10-05T00:00:00.000Z"),
                outcome: "strong",
                sessionId,
              }),
              evidence({
                createdAt: new Date("2026-10-01T00:00:00.000Z"),
                outcome: "partial",
              }),
            ],
          }),
        }),
      },
    });
    await expect(
      service.getRetestComparison({
        session: {
          evidenceSyncStatus: "ready",
          focusSkillKey: "api-design",
          id: sessionId,
          sessionPurpose: "targeted_practice",
          startedAt: new Date("2026-10-04T00:00:00.000Z"),
        },
        userId,
      }),
    ).resolves.toMatchObject({
      currentMasteryScore: 83,
      previousMasteryScore: 65,
      skillKey: "api-design",
    });
  });
});
