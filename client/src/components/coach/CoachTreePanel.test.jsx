import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CoachTreePanel from "./CoachTreePanel.jsx";

const getCoachTree = vi.hoisted(() => vi.fn());
vi.mock("../../api/coachTreeApi.js", () => ({ getCoachTree }));

const tree = {
  context: { kind: "overall", label: "Overall preparation" },
  edges: [{ from: "context", to: "branch:overall" }, { from: "branch:overall", to: "skill:node-js" }],
  evidenceSyncStatus: "ready",
  nodes: [
    { id: "context", kind: "context", label: "Overall preparation" },
    { id: "branch:overall", kind: "branch", label: "Overall skill evidence" },
    { confidence: "provisional", evidenceCount: 1, id: "skill:node-js", kind: "skill", label: "Node.js", replayTo: "/practice/507f1f77bcf86cd799439011/results" },
  ],
  omittedSkillCount: 1,
};

describe("CoachTreePanel", () => {
  beforeEach(() => getCoachTree.mockReset());
  it("renders ordered-list tree, safe replay link, and omission label", async () => {
    getCoachTree.mockResolvedValue(tree);
    render(<MemoryRouter><CoachTreePanel context={{ kind: "overall" }} /></MemoryRouter>);
    expect(await screen.findByText("Overall skill evidence")).toBeVisible();
    expect(screen.getByRole("link", { name: "Review replay" })).toHaveAttribute("href", "/practice/507f1f77bcf86cd799439011/results");
    expect(screen.getByText(/lower-priority skill/)).toBeVisible();
  });
  it("shows malformed-response retry", async () => {
    getCoachTree.mockRejectedValueOnce(Object.assign(new Error("Coach tree returned an unexpected response. Please try again."), { code: "COACH_MALFORMED_RESPONSE" })).mockResolvedValueOnce(tree);
    render(<MemoryRouter><CoachTreePanel context={{ kind: "overall" }} /></MemoryRouter>);
    expect(await screen.findByText(/unexpected response/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry tree" }));
    expect(await screen.findByText(/Node\.js:/)).toBeVisible();
  });
});
