import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import PracticePage from "./PracticePage.jsx";

const targetId = "507f1f77bcf86cd799439011";
const projectId = "507f1f77bcf86cd799439012";
const adaptiveNotice =
  "Later questions adapt to your answers and are not prewritten.";
const timestamp = "2026-10-10T00:00:00.000Z";
const target = {
  analysis: {
    requirements: [
      {
        evidenceTerms: [],
        key: "backend",
        label: "Backend engineering",
        priority: "required",
      },
    ],
    roleSummary: "Build reliable backend services with safe Node.js APIs.",
    skills: [
      {
        key: "node-js",
        label: "Node.js",
        sourceRequirementKeys: ["backend"],
        weight: 5,
      },
    ],
  },
  createdAt: timestamp,
  description:
    "Build backend services with bounded APIs, reliable persistence, secure ownership checks, and clear operational recovery paths.",
  id: targetId,
  status: "ready",
  title: "Backend Engineer",
  updatedAt: timestamp,
};
const project = {
  architecture: ["Node.js service uses a bounded API layer."],
  claims: [],
  confirmedAt: timestamp,
  createdAt: timestamp,
  decisions: [],
  id: projectId,
  name: "Payments Platform",
  responsibilities: ["Built secure payment orchestration services."],
  role: "Engineer",
  summary: "Built a reliable payment platform with audited service boundaries.",
  technologies: ["Node.js"],
  tradeoffs: [],
  updatedAt: timestamp,
};

function response(body) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  };
}

function plan({ context, interviewType, rationaleKind }) {
  return {
    adaptiveNotice,
    context,
    openingFocus: { label: "Fundamentals", topicKey: "fundamentals" },
    rationale: { kind: rationaleKind },
    selection: {
      interviewType,
      level: "intermediate",
      sessionPurpose: "standard",
    },
    stages: [
      {
        focus: { label: "Fundamentals", topicKey: "fundamentals" },
        order: 1,
        type: "opening",
      },
    ],
  };
}

function installFetch() {
  return vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      const path = new URL(url).pathname;
      const query = new URL(url).searchParams;
      if (path.endsWith("/job-targets"))
        return Promise.resolve(response({ items: [target] }));
      if (path.endsWith("/projects"))
        return Promise.resolve(response({ items: [project] }));
      if (path.endsWith("/resumes"))
        return Promise.resolve(response({ items: [] }));
      if (path.endsWith("/skills/profile"))
        return Promise.resolve(response({ skills: [] }));
      if (path.endsWith("/interviews/plan")) {
        const interviewType = query.get("interviewType");
        return Promise.resolve(
          response(
            interviewType === "Role Simulation"
              ? plan({
                  context: { kind: "job_target", label: "Backend Engineer" },
                  interviewType,
                  rationaleKind: "target_coverage",
                })
              : plan({
                  context: {
                    kind: "candidate_project",
                    label: "Payments Platform",
                  },
                  interviewType,
                  rationaleKind: "project_coverage",
                }),
          ),
        );
      }
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
}

function renderPractice(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PracticePage />
    </MemoryRouter>,
  );
}

describe("PracticePage contextual planner readiness", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [
      "Role Simulation",
      `/practice?type=Role%20Simulation&targetId=${targetId}`,
    ],
    [
      "Project Defense",
      `/practice?type=Project%20Defense&projectId=${projectId}`,
    ],
  ])(
    "enables Start after real parsed %s plan",
    async (interviewType, initialEntry) => {
      installFetch();
      renderPractice(initialEntry);

      fireEvent.click(screen.getByLabelText(/Intermediate/i));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Start interview" }),
        ).toBeEnabled();
      });
      expect(
        screen.getByRole("button", { name: new RegExp(interviewType, "i") }),
      ).toHaveAttribute("aria-pressed", "true");
    },
  );
});
