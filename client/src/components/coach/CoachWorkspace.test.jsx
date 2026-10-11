import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CoachWorkspace from "./CoachWorkspace.jsx";

const getCoachRoadmap = vi.hoisted(() => vi.fn());
const getCoachTree = vi.hoisted(() => vi.fn());
const getInterviewPlan = vi.hoisted(() => vi.fn());
const getSkillProfile = vi.hoisted(() => vi.fn());

vi.mock("../../api/coachApi.js", () => ({ getCoachRoadmap }));
vi.mock("../../api/coachTreeApi.js", () => ({ getCoachTree }));
vi.mock("../../api/interviewPlanApi.js", () => ({ getInterviewPlan }));
vi.mock("../../api/skillApi.js", () => ({ getSkillProfile }));

const roadmap = {
  actions: [],
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
const tree = {
  context: { kind: "overall", label: "Overall preparation" },
  edges: [
    { from: "context", to: "branch:overall" },
    { from: "branch:overall", to: "skill:node-js" },
  ],
  evidenceSyncStatus: "ready",
  nodes: [
    { id: "context", kind: "context", label: "Overall preparation" },
    { id: "branch:overall", kind: "branch", label: "Overall skill evidence" },
    {
      confidence: "provisional",
      evidenceCount: 1,
      id: "skill:node-js",
      kind: "skill",
      label: "Node.js",
      masteryLabel: "needs_work",
      masteryScore: 30,
      replayTo: null,
      skillKey: "node-js",
      skillLabel: "Node.js",
    },
  ],
  omittedSkillCount: 0,
};
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

function deferred() {
  let resolve;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe("CoachWorkspace", () => {
  beforeEach(() => {
    getCoachRoadmap.mockReset().mockResolvedValue(roadmap);
    getCoachTree.mockReset().mockResolvedValue(tree);
    getInterviewPlan.mockReset().mockResolvedValue(plan);
    getSkillProfile.mockReset().mockResolvedValue({ skills: [] });
  });

  it("refreshes all panels, retains prior content, and labels unchanged evidence", async () => {
    render(
      <MemoryRouter>
        <CoachWorkspace projects={[]} targets={[]} />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Overall skill evidence")).toBeVisible();
    expect(await screen.findByText("Opening focus:")).toBeVisible();

    const nextRoadmap = deferred();
    const nextTree = deferred();
    const nextPlan = deferred();
    const nextProfile = deferred();
    getCoachRoadmap.mockReturnValueOnce(nextRoadmap.promise);
    getCoachTree.mockReturnValueOnce(nextTree.promise);
    getInterviewPlan.mockReturnValueOnce(nextPlan.promise);
    getSkillProfile.mockReturnValueOnce(nextProfile.promise);
    fireEvent.click(screen.getByRole("button", { name: "Refresh Coach" }));

    expect(
      screen.getByRole("button", { name: "Refresh Coach" }),
    ).toBeDisabled();
    expect(screen.getByText("Overall skill evidence")).toBeVisible();
    expect(screen.getByText("Opening focus:")).toBeVisible();
    await waitFor(() => {
      expect(getCoachRoadmap).toHaveBeenCalledTimes(2);
      expect(getCoachTree).toHaveBeenCalledTimes(2);
      expect(getInterviewPlan).toHaveBeenCalledTimes(2);
      expect(getSkillProfile).toHaveBeenCalledTimes(2);
    });

    nextRoadmap.resolve(roadmap);
    nextTree.resolve(tree);
    nextPlan.resolve(plan);
    nextProfile.resolve({ skills: [] });
    expect(
      await screen.findByText(
        "Updated Coach view using current saved evidence.",
      ),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Refresh Coach" }));
    await waitFor(() => {
      expect(getCoachRoadmap).toHaveBeenCalledTimes(3);
      expect(getCoachTree).toHaveBeenCalledTimes(3);
      expect(getInterviewPlan).toHaveBeenCalledTimes(3);
      expect(getSkillProfile).toHaveBeenCalledTimes(3);
    });
    expect(await screen.findByText("No new evidence.")).toBeVisible();
  });

  it("reports pending evidence and preserves prior content on a failed panel refresh", async () => {
    render(
      <MemoryRouter>
        <CoachWorkspace projects={[]} targets={[]} />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Overall skill evidence")).toBeVisible();

    getCoachRoadmap.mockResolvedValueOnce({
      ...roadmap,
      evidenceSyncStatus: "pending",
    });
    fireEvent.click(screen.getByRole("button", { name: "Refresh Coach" }));
    expect(
      await screen.findByText(
        "Evidence still syncing. Coach uses currently saved evidence.",
      ),
    ).toBeVisible();

    getCoachTree.mockRejectedValueOnce(new Error("Offline"));
    fireEvent.click(screen.getByRole("button", { name: "Refresh Coach" }));
    expect(
      await screen.findByText(
        "Coach refresh incomplete. Showing last loaded view. Retry Coach.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Overall skill evidence")).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry tree" })).toBeVisible();
  });

  it("aborts an obsolete refresh when context changes", async () => {
    render(
      <MemoryRouter>
        <CoachWorkspace
          projects={[]}
          targets={[
            { id: "target-1", status: "ready", title: "Backend Engineer" },
          ]}
        />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Overall skill evidence")).toBeVisible();
    const staleRoadmap = deferred();
    getCoachRoadmap.mockReturnValueOnce(staleRoadmap.promise);
    fireEvent.click(screen.getByRole("button", { name: "Refresh Coach" }));
    await waitFor(() => {
      expect(getCoachRoadmap).toHaveBeenCalledTimes(2);
      expect(getCoachTree).toHaveBeenCalledTimes(2);
      expect(getInterviewPlan).toHaveBeenCalledTimes(2);
      expect(getSkillProfile).toHaveBeenCalledTimes(2);
    });
    const staleSignal = getCoachRoadmap.mock.calls[1][0].signal;
    const staleTreeSignal = getCoachTree.mock.calls[1][0].signal;
    const stalePlanSignal = getInterviewPlan.mock.calls[1][0].signal;
    const staleProfileSignal = getSkillProfile.mock.calls[1][0].signal;

    fireEvent.change(screen.getByLabelText("Preparation context"), {
      target: { value: "target:target-1" },
    });
    await waitFor(() => {
      expect(staleSignal.aborted).toBe(true);
      expect(staleTreeSignal.aborted).toBe(true);
      expect(stalePlanSignal.aborted).toBe(true);
      expect(staleProfileSignal.aborted).toBe(true);
    });
    staleRoadmap.resolve(roadmap);
    await waitFor(() =>
      expect(getCoachRoadmap).toHaveBeenLastCalledWith(
        expect.objectContaining({ context: "target", targetId: "target-1" }),
      ),
    );
  });
});
