import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SkillsPage from "./SkillsPage.jsx";

const getSkillProfile = vi.hoisted(() => vi.fn());
vi.mock("../api/skillApi.js", () => ({ getSkillProfile }));

function renderPage() {
  return render(
    <MemoryRouter>
      <SkillsPage />
    </MemoryRouter>,
  );
}

describe("SkillsPage", () => {
  beforeEach(() => getSkillProfile.mockReset());

  it("renders safe skill evidence and focused-practice handoff", async () => {
    getSkillProfile.mockResolvedValueOnce({
      evidenceSyncStatus: "ready",
      recommendedAction: { skillKey: "node-js", type: "targeted_practice" },
      skills: [
        {
          confidence: "provisional",
          evidenceCount: 1,
          lastPracticedAt: "2026-10-06T00:00:00.000Z",
          masteryLabel: "needs_work",
          masteryScore: 35,
          skillKey: "node-js",
          skillLabel: "Node.js",
        },
      ],
    });
    renderPage();
    expect(
      await screen.findByRole("heading", { name: "Node.js" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Practise Node.js next/ }),
    ).toHaveAttribute("href", "/practice?focusSkillKey=node-js");
    expect(
      screen.getByText(
        /Focused practice adds evidence\. It does not predict readiness/,
      ),
    ).toBeVisible();
  });

  it("shows retryable profile failure", async () => {
    getSkillProfile.mockRejectedValueOnce(
      new Error("Skills could not be loaded."),
    );
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Skills could not be loaded.",
    );
  });

  it("uses practice guidance without internal-version language", async () => {
    getSkillProfile.mockResolvedValueOnce({
      evidenceSyncStatus: "ready",
      recommendedAction: null,
      skills: [],
    });
    renderPage();
    expect(
      await screen.findByText(
        "Complete a practice session to start building your confidence-labelled skill view.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/V2 practice session/)).toBeNull();
  });
});
