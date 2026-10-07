import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CoachPanel from "./CoachPanel.jsx";

const getCoachRoadmap = vi.hoisted(() => vi.fn());

vi.mock("../../api/coachApi.js", () => ({ getCoachRoadmap }));

const roadmap = {
  actions: [
    {
      description: "Collect another focused evidence point through practice.",
      label: "Practise Node.js",
      to: "/practice?focusSkillKey=node-js",
      type: "targeted_practice",
    },
    {
      description: "Add a role context for Role Simulation practice.",
      label: "Add Job Target",
      to: "/targets",
      type: "add_context",
    },
    {
      description: "Confirm project facts for Project Defense practice.",
      label: "Confirm Project",
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
      skillKey: "node-js",
      skillLabel: "Node.js",
    },
  ],
};

function renderPanel() {
  return render(
    <MemoryRouter>
      <CoachPanel
        projects={[{ id: "project-1", name: "MockMateAI" }]}
        targets={[{ id: "target-1", status: "ready", title: "Backend Engineer" }]}
      />
    </MemoryRouter>,
  );
}

describe("CoachPanel", () => {
  beforeEach(() => getCoachRoadmap.mockReset());

  it("renders safe roadmap and changes owned context", async () => {
    getCoachRoadmap
      .mockResolvedValueOnce(roadmap)
      .mockResolvedValueOnce({ ...roadmap, context: { kind: "job_target", label: "Backend Engineer" } });
    renderPanel();

    expect(await screen.findByText("Node.js")).toBeVisible();
    expect(screen.getByRole("link", { name: "Practise Node.js" })).toHaveAttribute(
      "href",
      "/practice?focusSkillKey=node-js",
    );
    fireEvent.change(screen.getByLabelText("Preparation context"), {
      target: { value: "target:target-1" },
    });
    await waitFor(() =>
      expect(getCoachRoadmap).toHaveBeenLastCalledWith(
        expect.objectContaining({ context: "target", targetId: "target-1" }),
      ),
    );
  });

  it("shows labelled malformed-response recovery and retries", async () => {
    getCoachRoadmap
      .mockRejectedValueOnce(
        Object.assign(new Error("Coach returned an unexpected response. Please try again."), {
          code: "COACH_MALFORMED_RESPONSE",
        }),
      )
      .mockResolvedValueOnce(roadmap);
    renderPanel();

    expect(
      await screen.findByText("Coach returned an unexpected response. Please try again."),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry Coach" }));
    expect(await screen.findByText("Node.js")).toBeVisible();
  });

  it("labels pending evidence and empty skills honestly", async () => {
    getCoachRoadmap.mockResolvedValue({
      ...roadmap,
      evidenceSyncStatus: "pending",
      skills: [],
    });
    renderPanel();

    expect(await screen.findByText("No skill evidence yet. Choose an action to begin.")).toBeVisible();
    expect(screen.getByText(/Evidence is still syncing/)).toBeVisible();
  });
});
