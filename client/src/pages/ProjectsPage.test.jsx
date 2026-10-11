import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProjectsPage from "./ProjectsPage.jsx";

const api = vi.hoisted(() => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  extractProjectDrafts: vi.fn(),
  importReadmeDraft: vi.fn(),
  getProject: vi.fn(),
  listProjects: vi.fn(),
  listResumes: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("../api/projectApi.js", () => ({
  createProject: api.createProject,
  deleteProject: api.deleteProject,
  extractProjectDrafts: api.extractProjectDrafts,
  importReadmeDraft: api.importReadmeDraft,
  getProject: api.getProject,
  listProjects: api.listProjects,
  updateProject: api.updateProject,
}));
vi.mock("../api/resumeApi.js", () => ({ listResumes: api.listResumes }));

const facts = {
  architecture: ["React client with an Express API"],
  claims: [],
  decisions: [],
  name: "MockMateAI",
  responsibilities: ["Built and tested the interview workflow"],
  role: "Full-stack developer",
  summary: "An interview preparation application with structured feedback.",
  technologies: ["React", "Node.js"],
  tradeoffs: [],
};
const project = {
  ...facts,
  confirmedAt: "2026-10-04T00:00:00.000Z",
  createdAt: "2026-10-04T00:00:00.000Z",
  id: "project-1",
  updatedAt: "2026-10-04T00:00:00.000Z",
};
const draft = {
  ...facts,
  source: "resume_suggestion",
  sourceResumeId: "resume-1",
};
const partialDraft = {
  architecture: [],
  claims: [],
  decisions: [],
  missingFields: [
    "name",
    "role",
    "responsibilities",
    "architecture",
    "decisions",
    "tradeoffs",
    "claims",
  ],
  name: null,
  responsibilities: [],
  role: null,
  source: "resume_suggestion",
  sourceResumeId: "resume-1",
  summary: "Built a React interview practice application.",
  technologies: ["React"],
  tradeoffs: [],
};
const {
  missingFields: _missingFields,
  source: _source,
  ...partialFacts
} = partialDraft;
const partialProject = {
  ...partialFacts,
  createdAt: "2026-10-11T00:00:00.000Z",
  id: "partial-project-1",
  partialConfirmedAt: "2026-10-11T00:00:00.000Z",
  status: "partial",
  updatedAt: "2026-10-11T00:00:00.000Z",
};
const readmeDraft = {
  ...facts,
  source: "readme_import",
};
const readmeReview = {
  missingFields: ["decisions"],
  omittedLineCount: 2,
  recognizedSections: ["name", "summary"],
  unmatchedText: "Private note",
};
const resume = {
  extractionStatus: "completed",
  id: "resume-1",
  originalName: "resume.pdf",
};
const otherResume = {
  extractionStatus: "completed",
  id: "resume-2",
  originalName: "other-resume.pdf",
};

function renderPage(path = "/projects") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<ProjectsPage />} />
        <Route path="/projects/:projectId/edit" element={<ProjectsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProjectsPage", () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    api.listProjects.mockResolvedValue([]);
    api.listResumes.mockResolvedValue([resume]);
  });

  it("shows a truthful owned empty state", async () => {
    renderPage();
    expect(await screen.findByText("No projects yet")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Add your first project" }),
    ).toHaveAttribute("href", "/projects/new");
  });

  it("states completed-project field limits before saving", async () => {
    renderPage("/projects/new");
    expect(await screen.findByText("20–1,000 characters")).toBeVisible();
    expect(
      screen.getByText(
        "One architecture fact per line, 20–600 characters each",
      ),
    ).toBeVisible();
    expect(screen.getByText("Repeated items are not allowed.")).toBeVisible();
  });

  it("shows an incomplete project with an edit path, not Defense availability", async () => {
    api.listProjects.mockResolvedValue([partialProject]);
    renderPage();
    expect(await screen.findByText("Incomplete")).toBeVisible();
    expect(
      screen.getByText(
        "Complete and confirm this project before Project Defense.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/projects/partial-project-1/edit",
    );
  });

  it("keeps extracted suggestions unconfirmed until explicit review and save", async () => {
    api.extractProjectDrafts.mockResolvedValue([draft]);
    api.createProject.mockResolvedValue(project);
    renderPage("/projects/new");
    await screen.findByRole("heading", { name: "Add a project" });
    fireEvent.change(screen.getByLabelText("Resume source (optional)"), {
      target: { value: "resume-1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Suggest from resume" }),
    );
    expect(await screen.findByText("Unconfirmed suggestions")).toBeVisible();
    expect(api.createProject).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Review this draft" }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
    await waitFor(() =>
      expect(api.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "MockMateAI",
          sourceResumeId: "resume-1",
        }),
      ),
    );
  });

  it("renders and reviews a partial suggestion without saving it", async () => {
    api.extractProjectDrafts.mockResolvedValue([partialDraft]);
    renderPage("/projects/new");
    await screen.findByRole("heading", { name: "Add a project" });
    fireEvent.change(screen.getByLabelText("Resume source (optional)"), {
      target: { value: "resume-1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Suggest from resume" }),
    );
    expect(await screen.findByText("Untitled project draft")).toBeVisible();
    expect(screen.getByText(/Missing: name, role/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Review this draft" }));
    expect(screen.getByLabelText("Summary")).toHaveValue(
      "Built a React interview practice application.",
    );
    expect(screen.getByLabelText("Project name")).toHaveValue("");
    expect(api.createProject).not.toHaveBeenCalled();
  });

  it("keeps extraction unavailable until its in-flight retry can finish", async () => {
    let resolveExtraction;
    api.extractProjectDrafts.mockReturnValue(
      new Promise((resolve) => {
        resolveExtraction = resolve;
      }),
    );
    renderPage("/projects/new");
    await screen.findByRole("heading", { name: "Add a project" });
    fireEvent.change(screen.getByLabelText("Resume source (optional)"), {
      target: { value: "resume-1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Suggest from resume" }),
    );

    expect(
      screen.getByRole("button", { name: "Extracting suggestions…" }),
    ).toBeDisabled();
    resolveExtraction([draft]);
    expect(await screen.findByText("Unconfirmed suggestions")).toBeVisible();
  });

  it("retries failed suggestions with one attempt key and preserves drafts", async () => {
    api.listResumes.mockResolvedValue([resume, otherResume]);
    api.extractProjectDrafts
      .mockResolvedValueOnce([draft])
      .mockRejectedValueOnce(
        new Error("AI practice is temporarily unavailable."),
      )
      .mockResolvedValueOnce([draft])
      .mockResolvedValueOnce([draft]);
    renderPage("/projects/new");
    await screen.findByRole("heading", { name: "Add a project" });
    fireEvent.change(screen.getByLabelText("Resume source (optional)"), {
      target: { value: "resume-1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Suggest from resume" }),
    );
    await screen.findByText("Unconfirmed suggestions");
    fireEvent.click(screen.getByRole("button", { name: "Review this draft" }));
    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Preserved project draft" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Suggest from resume" }),
    );
    expect(
      await screen.findByText("AI practice is temporarily unavailable."),
    ).toBeVisible();
    expect(screen.getByText("Unconfirmed suggestions")).toBeVisible();
    expect(screen.getByLabelText("Project name")).toHaveValue(
      "Preserved project draft",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry suggestions" }));
    await waitFor(() =>
      expect(api.extractProjectDrafts).toHaveBeenCalledTimes(3),
    );
    expect(api.extractProjectDrafts.mock.calls[1][0].idempotencyKey).toBe(
      api.extractProjectDrafts.mock.calls[2][0].idempotencyKey,
    );
    expect(api.createProject).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Resume source (optional)"), {
      target: { value: "resume-2" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Suggest from resume" }),
    );
    await waitFor(() =>
      expect(api.extractProjectDrafts).toHaveBeenCalledTimes(4),
    );
    expect(api.extractProjectDrafts.mock.calls[3][0].idempotencyKey).not.toBe(
      api.extractProjectDrafts.mock.calls[2][0].idempotencyKey,
    );
  });

  it("retries README import, preserves manual edits, and renders bounded review", async () => {
    api.importReadmeDraft
      .mockRejectedValueOnce(new Error("README import failed."))
      .mockResolvedValueOnce({ draft: readmeDraft, review: readmeReview });
    renderPage("/projects/new");
    await screen.findByRole("heading", { name: "Add a project" });
    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Preserved manual project" },
    });
    const file = new File(["# MockMateAI"], "README.md", {
      type: "text/markdown",
    });
    fireEvent.change(screen.getByLabelText("Import project README"), {
      target: { files: [file] },
    });
    expect(await screen.findByText("README import failed.")).toBeVisible();
    expect(screen.getByLabelText("Project name")).toHaveValue(
      "Preserved manual project",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retry README import" }),
    );
    await waitFor(() => expect(api.importReadmeDraft).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Recognized: name, summary")).toBeVisible();
    expect(screen.getByText("Omitted unmatched lines: 2")).toBeVisible();
    expect(screen.getByText("Private note")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Review this draft" }));
    expect(screen.getByLabelText("Project name")).toHaveValue("MockMateAI");
  });

  it("groups readable README instructions with its file control", async () => {
    renderPage("/projects/new");
    await screen.findByRole("heading", { name: "Add a project" });
    expect(
      screen.getByText(
        "Choose one Markdown or text file up to 256 KiB and 100,000 decoded characters.",
      ),
    ).toBeVisible();
    expect(screen.getByLabelText("Import project README")).toHaveAttribute(
      "aria-describedby",
      "readme-import-help",
    );
  });

  it("preserves edited facts after save failure", async () => {
    api.createProject.mockRejectedValue(new Error("Save unavailable."));
    renderPage("/projects/new");
    await screen.findByRole("heading", { name: "Add a project" });
    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Edited project" },
    });
    fireEvent.change(screen.getByLabelText("Your role"), {
      target: { value: "Developer" },
    });
    fireEvent.change(screen.getByLabelText("Summary"), {
      target: {
        value: "A complete project summary that should remain after failure.",
      },
    });
    fireEvent.change(screen.getByLabelText(/^Technologies/), {
      target: { value: "React" },
    });
    fireEvent.change(screen.getByLabelText(/^Responsibilities/), {
      target: { value: "Built the user workflow" },
    });
    fireEvent.change(screen.getByLabelText(/^Architecture/), {
      target: { value: "Client and API layers" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
    expect(await screen.findByText("Save unavailable.")).toBeVisible();
    expect(screen.getByLabelText("Project name")).toHaveValue("Edited project");
  });

  it("allows manual entry and preserves it while retrying resume loading", async () => {
    api.listResumes
      .mockRejectedValueOnce(new Error("Resume list unavailable."))
      .mockResolvedValueOnce([resume]);
    renderPage("/projects/new");
    expect(await screen.findByText("Resume list unavailable.")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Preserved draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Retry resumes" }));
    await waitFor(() => expect(api.listResumes).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("Project name")).toHaveValue(
      "Preserved draft",
    );
    expect(screen.getByRole("option", { name: "resume.pdf" })).toBeVisible();
  });

  it("loads a full edit and requires renewed confirmation", async () => {
    api.getProject.mockResolvedValue(project);
    api.updateProject.mockResolvedValue({ ...project, name: "Updated" });
    renderPage("/projects/project-1/edit");
    expect(await screen.findByDisplayValue("MockMateAI")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and update" }));
    expect(await screen.findByText(/Confirm that you reviewed/)).toBeVisible();
    expect(api.updateProject).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm and update" }));
    await waitFor(() =>
      expect(api.updateProject).toHaveBeenCalledWith(
        "project-1",
        expect.objectContaining({ name: "Updated" }),
      ),
    );
  });

  it("highlights safe validation failures and preserves correction input", async () => {
    api.getProject.mockResolvedValue(project);
    api.updateProject.mockRejectedValueOnce(
      Object.assign(new Error("Check the highlighted fields."), {
        fields: {
          "architecture.0":
            "architecture.0 must be between 5 and 300 characters.",
          request: "Ignored request-level detail.",
        },
      }),
    );
    renderPage("/projects/project-1/edit");
    const architecture = await screen.findByLabelText(/Architecture/);
    fireEvent.change(architecture, { target: { value: "x" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm and update" }));

    expect(
      await screen.findByText(
        "architecture.0 must be between 5 and 300 characters.",
      ),
    ).toBeVisible();
    expect(architecture).toHaveAttribute("aria-invalid", "true");
    expect(architecture).toHaveValue("x");
    expect(screen.queryByText("Ignored request-level detail.")).toBeNull();

    fireEvent.change(architecture, {
      target: { value: "Client and API architecture" },
    });
    expect(architecture).toHaveAttribute("aria-invalid", "false");
    expect(
      screen.queryByText(
        "architecture.0 must be between 5 and 300 characters.",
      ),
    ).toBeNull();
  });

  it("keeps a project visible when deletion fails", async () => {
    api.listProjects.mockResolvedValue([project]);
    api.deleteProject.mockRejectedValue(new Error("Delete unavailable."));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    await screen.findByText("MockMateAI");
    expect(screen.getByText("Ready")).toBeVisible();
    expect(screen.getByText("Available for Project Defense.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Delete unavailable.")).toBeVisible();
    expect(screen.getByText("MockMateAI")).toBeVisible();
    window.confirm.mockRestore();
  });
});
