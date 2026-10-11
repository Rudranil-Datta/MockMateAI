import { beforeEach, describe, expect, it, vi } from "vitest";

import { getInterviewPlan } from "./interviewPlanApi.js";

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock("./httpClient.js", () => ({ apiRequest }));

const plan = {
  adaptiveNotice:
    "Later questions adapt to your answers and are not prewritten.",
  context: null,
  openingFocus: { label: "Fundamentals", topicKey: "dsa-1" },
  rationale: { kind: "type_level" },
  selection: {
    interviewType: "DSA",
    level: "intermediate",
    sessionPurpose: "standard",
  },
  stages: [
    {
      focus: { label: "Fundamentals", topicKey: "dsa-1" },
      order: 1,
      type: "opening",
    },
  ],
};

function contextualPlan({ context, interviewType, rationaleKind }) {
  return {
    ...plan,
    context,
    rationale: { kind: rationaleKind },
    selection: { ...plan.selection, interviewType },
  };
}

describe("getInterviewPlan", () => {
  beforeEach(() => apiRequest.mockReset());

  it("requests and accepts safe bounded plan", async () => {
    apiRequest.mockResolvedValue(plan);
    await expect(
      getInterviewPlan({ interviewType: "DSA", level: "intermediate" }),
    ).resolves.toEqual(plan);
    expect(apiRequest).toHaveBeenCalledWith(
      "interviews/plan?interviewType=DSA&level=intermediate",
      { signal: undefined },
    );
  });

  it("rejects prewritten prompt data and mismatched selection", async () => {
    apiRequest.mockResolvedValue({ ...plan, prompt: "Unsafe question" });
    await expect(
      getInterviewPlan({ interviewType: "DSA", level: "intermediate" }),
    ).rejects.toMatchObject({ code: "INTERVIEW_PLAN_MALFORMED_RESPONSE" });
    apiRequest.mockResolvedValue({
      ...plan,
      selection: { ...plan.selection, level: "advanced" },
    });
    await expect(
      getInterviewPlan({ interviewType: "DSA", level: "intermediate" }),
    ).rejects.toMatchObject({ code: "INTERVIEW_PLAN_MALFORMED_RESPONSE" });
    apiRequest.mockResolvedValue({
      ...plan,
      context: { kind: "job_target", label: "Wrong context" },
    });
    await expect(
      getInterviewPlan({ interviewType: "DSA", level: "intermediate" }),
    ).rejects.toMatchObject({ code: "INTERVIEW_PLAN_MALFORMED_RESPONSE" });
  });

  it.each([
    [
      "Role Simulation",
      "jobTargetId",
      "target-123",
      contextualPlan({
        context: { kind: "job_target", label: "Backend Engineer" },
        interviewType: "Role Simulation",
        rationaleKind: "target_coverage",
      }),
    ],
    [
      "Project Defense",
      "projectId",
      "project-123",
      contextualPlan({
        context: { kind: "candidate_project", label: "Payments Platform" },
        interviewType: "Project Defense",
        rationaleKind: "project_coverage",
      }),
    ],
  ])(
    "accepts matching contextual %s plan",
    async (interviewType, contextKey, contextId, contextual) => {
      apiRequest.mockResolvedValue(contextual);

      await expect(
        getInterviewPlan({
          [contextKey]: contextId,
          interviewType,
          level: "intermediate",
        }),
      ).resolves.toEqual(contextual);
    },
  );
});
