import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ResumesPage from "./ResumesPage.jsx";

const listResumes = vi.hoisted(() => vi.fn());
const uploadResume = vi.hoisted(() => vi.fn());

vi.mock("../api/resumeApi.js", () => ({
  listResumes,
  maxResumeSizeBytes: 5 * 1024 * 1024,
  uploadResume,
}));

const completedResume = {
  createdAt: "2026-09-21T00:00:00.000Z",
  extractionStatus: "completed",
  id: "resume-1",
  mimeType: "application/pdf",
  originalName: "engineer.pdf",
  sizeBytes: 1024,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ResumesPage />
    </MemoryRouter>,
  );
}

describe("ResumesPage", () => {
  beforeEach(() => {
    listResumes.mockReset();
    uploadResume.mockReset();
  });

  it("loads completed and failed resumes without private content", async () => {
    listResumes.mockResolvedValue([
      completedResume,
      {
        ...completedResume,
        extractionStatus: "failed",
        id: "resume-2",
        originalName: "broken.pdf",
      },
    ]);
    renderPage();

    expect(screen.getByText("Loading resumes…")).toBeVisible();
    expect(await screen.findByText("engineer.pdf")).toBeVisible();
    expect(screen.getByText("Ready to use")).toBeVisible();
    expect(screen.getByText("broken.pdf")).toBeVisible();
    expect(screen.getByText("Could not read")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Use in interview" }),
    ).toHaveAttribute("href", "/practice?resumeId=resume-1");
    expect(screen.queryByText(/extracted/i)).not.toBeInTheDocument();
  });

  it("shows truthful empty state", async () => {
    listResumes.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("No resumes uploaded")).toBeVisible();
    expect(screen.getByText(/always work without a resume/)).toBeVisible();
  });

  it("retries list loading after a safe failure", async () => {
    listResumes
      .mockRejectedValueOnce(new Error("Resume list could not be loaded."))
      .mockResolvedValueOnce([completedResume]);
    renderPage();

    expect(
      await screen.findByText("Resume list could not be loaded."),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry list" }));
    expect(await screen.findByText("engineer.pdf")).toBeVisible();
    expect(listResumes).toHaveBeenCalledTimes(2);
  });

  it.each([
    [new File(["text"], "resume.txt", { type: "text/plain" }), /PDF file/],
    [new File([], "empty.pdf", { type: "application/pdf" }), /non-empty/],
    [
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf", {
        type: "application/pdf",
      }),
      /5 MiB or smaller/,
    ],
  ])("rejects invalid local file before upload", async (file, message) => {
    listResumes.mockResolvedValue([]);
    renderPage();
    await screen.findByText("No resumes uploaded");

    fireEvent.change(screen.getByLabelText("Choose PDF"), {
      target: { files: [file] },
    });

    expect(await screen.findByText(message)).toBeVisible();
    expect(uploadResume).not.toHaveBeenCalled();
  });

  it("shows progress, locks picker, and adds completed upload", async () => {
    let resolveUpload;
    listResumes.mockResolvedValue([]);
    uploadResume.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    renderPage();
    await screen.findByText("No resumes uploaded");
    const file = new File(["%PDF-1.7"], "engineer.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(screen.getByLabelText("Choose PDF"), {
      target: { files: [file] },
    });

    expect(screen.getByText("Reading your resume…")).toBeVisible();
    expect(screen.getByLabelText("Choose PDF")).toBeDisabled();
    expect(uploadResume).toHaveBeenCalledTimes(1);
    resolveUpload(completedResume);

    expect(
      await screen.findByText("Resume uploaded and ready to use."),
    ).toBeVisible();
    expect(screen.getByText("engineer.pdf")).toBeVisible();
  });

  it("accepts a dropped PDF once while upload is pending", async () => {
    listResumes.mockResolvedValue([]);
    uploadResume.mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();
    await screen.findByText("No resumes uploaded");
    const dropZone = container.querySelector(".resume-drop-zone");
    const file = new File(["%PDF-1.7"], "drop.pdf", {
      type: "application/pdf",
    });

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(uploadResume).toHaveBeenCalledTimes(1);
  });

  it("explains failed extraction and upload retry paths", async () => {
    listResumes.mockResolvedValue([]);
    uploadResume
      .mockResolvedValueOnce({
        ...completedResume,
        extractionStatus: "failed",
      })
      .mockRejectedValueOnce(new Error("Network unavailable."));
    renderPage();
    await screen.findByText("No resumes uploaded");
    const input = screen.getByLabelText("Choose PDF");
    const file = new File(["%PDF-1.7"], "engineer.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(input, { target: { files: [file] } });
    expect(
      await screen.findByText(/text could not be read.*continue without/),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Use in interview" }),
    ).not.toBeInTheDocument();

    fireEvent.change(input, { target: { files: [file] } });
    expect(
      await screen.findByText(
        /Network unavailable.*try again.*continue without/,
      ),
    ).toBeVisible();
    await waitFor(() => expect(input).not.toBeDisabled());
  });
});
