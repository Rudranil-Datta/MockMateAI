import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InterviewPlannerPreview from "./InterviewPlannerPreview.jsx";

const getInterviewPlan = vi.hoisted(() => vi.fn());
vi.mock("../../api/interviewPlanApi.js", () => ({ getInterviewPlan }));

const plan = {
  adaptiveNotice: "Later questions adapt to your answers and are not prewritten.",
  context: null,
  openingFocus: { label: "Fundamentals", topicKey: "dsa-1" },
  rationale: { kind: "type_level" },
  selection: { interviewType: "DSA", level: "intermediate", sessionPurpose: "standard" },
  stages: [{ focus: { label: "Fundamentals", topicKey: "dsa-1" }, order: 1, type: "opening" }],
};

describe("InterviewPlannerPreview", () => {
  beforeEach(() => getInterviewPlan.mockReset());

  it("renders labelled plan without prewritten question claim", async () => {
    getInterviewPlan.mockResolvedValue(plan);
    render(<InterviewPlannerPreview selection={{ interviewType: "DSA", level: "intermediate" }} />);
    expect(await screen.findByText("Opening focus:")).toBeVisible();
    expect(screen.getByRole("list", { name: "Intended interview stages" })).toHaveTextContent("Fundamentals");
    expect(screen.getByText(/Later questions adapt/)).toBeVisible();
  });

  it("shows recoverable retry state", async () => {
    getInterviewPlan.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(plan);
    render(<InterviewPlannerPreview selection={{ interviewType: "DSA", level: "intermediate" }} />);
    expect(await screen.findByText(/could not be loaded/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry plan" }));
    expect(await screen.findByRole("list", { name: "Intended interview stages" })).toBeVisible();
  });
});
