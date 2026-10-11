import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CoachPlannerPanel from "./CoachPlannerPanel.jsx";

const getInterviewPlan = vi.hoisted(() => vi.fn());
const getSkillProfile = vi.hoisted(() => vi.fn());

vi.mock("../../api/interviewPlanApi.js", () => ({ getInterviewPlan }));
vi.mock("../../api/skillApi.js", () => ({ getSkillProfile }));

function plan(selection) {
  return {
    adaptiveNotice:
      "Later questions adapt to your answers and are not prewritten.",
    context:
      selection.interviewType === "Role Simulation"
        ? { kind: "job_target", label: "Backend Engineer" }
        : selection.interviewType === "Project Defense"
          ? { kind: "candidate_project", label: "MockMateAI" }
          : null,
    openingFocus: { label: "Fundamentals", topicKey: "dsa-1" },
    rationale: { kind: "type_level" },
    selection: {
      interviewType: selection.interviewType,
      level: selection.level,
      sessionPurpose: selection.sessionPurpose || "standard",
    },
    stages: [
      {
        focus: { label: "Fundamentals", topicKey: "dsa-1" },
        order: 1,
        type: "opening",
      },
    ],
  };
}

describe("CoachPlannerPanel", () => {
  beforeEach(() => {
    getInterviewPlan.mockReset();
    getSkillProfile.mockReset();
    getSkillProfile.mockResolvedValue({ skills: [] });
    getInterviewPlan.mockImplementation(({ signal: _signal, ...selection }) =>
      Promise.resolve(plan(selection)),
    );
  });

  it.each([
    [{ kind: "overall" }, "DSA", "/practice?level=intermediate&type=DSA"],
    [
      { id: "target-1", kind: "target" },
      "Role Simulation",
      "/practice?level=intermediate&type=Role+Simulation&targetId=target-1",
    ],
    [
      { id: "project-1", kind: "project" },
      "Project Defense",
      "/practice?level=intermediate&type=Project+Defense&projectId=project-1",
    ],
  ])(
    "uses compatible %s context and only links to Practice",
    async (context, interviewType, href) => {
      render(
        <MemoryRouter>
          <CoachPlannerPanel context={context} />
        </MemoryRouter>,
      );

      await waitFor(() =>
        expect(getInterviewPlan).toHaveBeenCalledWith(
          expect.objectContaining({ interviewType }),
        ),
      );
      expect(
        await screen.findByRole("link", {
          name: "Adjust your choices and start practice",
        }),
      ).toHaveAttribute("href", href);
    },
  );
});
