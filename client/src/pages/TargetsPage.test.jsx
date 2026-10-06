import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TargetsPage from "./TargetsPage.jsx";

const createJobTarget = vi.hoisted(() => vi.fn());
const deleteJobTarget = vi.hoisted(() => vi.fn());
const listJobTargets = vi.hoisted(() => vi.fn());
const updateJobTarget = vi.hoisted(() => vi.fn());
vi.mock("../api/jobTargetApi.js", () => ({
  createJobTarget,
  deleteJobTarget,
  listJobTargets,
  updateJobTarget,
}));

const readyTarget = {
  analysis: {
    requirements: [
      {
        evidenceTerms: ["Node.js"],
        key: "node-js",
        label: "Node.js",
        priority: "required",
      },
    ],
    roleSummary: "Build reliable backend services with Node.js and testing.",
    skills: [
      {
        key: "node-js",
        label: "Node.js",
        sourceRequirementKeys: ["node-js"],
        weight: 5,
      },
    ],
  },
  company: "MockMateAI",
  createdAt: "2026-10-07T00:00:00.000Z",
  description: "Build reliable backend services with Node.js and testing.".repeat(3),
  id: "target-1",
  status: "ready",
  title: "Backend Engineer",
  updatedAt: "2026-10-07T00:00:00.000Z",
};

describe("TargetsPage", () => {
  beforeEach(() => {
    createJobTarget.mockReset();
    deleteJobTarget.mockReset();
    listJobTargets.mockReset();
    updateJobTarget.mockReset();
  });

  it("shows safe analysis, Role Simulation handoff, and explicit reanalysis", async () => {
    listJobTargets.mockResolvedValueOnce([readyTarget]);
    updateJobTarget.mockResolvedValueOnce(readyTarget);
    render(
      <MemoryRouter>
        <TargetsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ready for Role Simulation")).toBeVisible();
    expect(screen.getByText(/Requirements: Node.js \(required\)/)).toBeVisible();
    expect(screen.getByText(/Weighted skills: Node.js \(5\/5\)/)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Role Simulation" }),
    ).toHaveAttribute(
      "href",
      "/practice?type=Role%20Simulation&targetId=target-1",
    );
    expect(screen.queryByText(readyTarget.description)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reanalyze" }));
    await waitFor(() =>
      expect(updateJobTarget).toHaveBeenCalledWith(
        expect.objectContaining({ targetId: "target-1" }),
      ),
    );
  });

  it("preserves target draft after save failure", async () => {
    listJobTargets.mockResolvedValueOnce([]);
    createJobTarget.mockRejectedValueOnce(new Error("Analysis unavailable."));
    render(
      <MemoryRouter>
        <TargetsPage />
      </MemoryRouter>,
    );
    await screen.findByText("No Job Targets yet");
    fireEvent.change(screen.getByLabelText("Role title"), {
      target: { value: "Backend Engineer" },
    });
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: {
        value:
          "Build secure Node.js services with reliable testing and thoughtful database design.".repeat(
            2,
          ),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save and analyze" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your draft is still here.",
    );
    expect(screen.getByLabelText("Role title")).toHaveValue("Backend Engineer");
  });
});
