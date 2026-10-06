import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TargetsPage from "./TargetsPage.jsx";

const createJobTarget = vi.hoisted(() => vi.fn());
const deleteJobTarget = vi.hoisted(() => vi.fn());
const listJobTargets = vi.hoisted(() => vi.fn());
vi.mock("../api/jobTargetApi.js", () => ({
  createJobTarget,
  deleteJobTarget,
  listJobTargets,
}));

describe("TargetsPage", () => {
  beforeEach(() => {
    createJobTarget.mockReset();
    deleteJobTarget.mockReset();
    listJobTargets.mockReset();
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
