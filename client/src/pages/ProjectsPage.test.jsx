import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProjectsPage from "./ProjectsPage.jsx";

const api = vi.hoisted(() => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  extractProjectDrafts: vi.fn(),
  getProject: vi.fn(),
  listProjects: vi.fn(),
  listResumes: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("../api/projectApi.js", () => ({
  createProject: api.createProject,
  deleteProject: api.deleteProject,
  extractProjectDrafts: api.extractProjectDrafts,
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
const resume = {
  extractionStatus: "completed",
  id: "resume-1",
  originalName: "resume.pdf",
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
    expect(await screen.findByText("No confirmed projects")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Add your first project" }),
    ).toHaveAttribute("href", "/projects/new");
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

  it("keeps a project visible when deletion fails", async () => {
    api.listProjects.mockResolvedValue([project]);
    api.deleteProject.mockRejectedValue(new Error("Delete unavailable."));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    await screen.findByText("MockMateAI");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Delete unavailable.")).toBeVisible();
    expect(screen.getByText("MockMateAI")).toBeVisible();
    window.confirm.mockRestore();
  });
});
