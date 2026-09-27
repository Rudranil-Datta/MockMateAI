import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, FileUp, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

import {
  listResumes,
  maxResumeSizeBytes,
  uploadResume,
} from "../api/resumeApi.js";
import Button from "../components/common/Button.jsx";
import Card from "../components/common/Card.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";

const maxResumeSizeLabel = "5 MiB";

function validateResumeFile(file) {
  if (!file) {
    return "Choose a PDF resume to upload.";
  }

  if (
    file.type !== "application/pdf" ||
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return "Choose a PDF file.";
  }

  if (file.size < 1) {
    return "Choose a non-empty PDF file.";
  }

  if (file.size > maxResumeSizeBytes) {
    return `Resume must be ${maxResumeSizeLabel} or smaller.`;
  }

  return "";
}

function formatUploadDate(value) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function statusLabel(status) {
  if (status === "completed") {
    return "Ready to use";
  }

  if (status === "failed") {
    return "Could not read";
  }

  return "Reading";
}

function ResumesPage() {
  const fileInputRef = useRef(null);
  const uploadInFlightRef = useRef(false);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const loadResumeList = useCallback(async (signal) => {
    await Promise.resolve();
    setIsLoading(true);
    setLoadError("");

    try {
      setResumes(await listResumes({ signal }));
    } catch (error) {
      if (!signal?.aborted) {
        setLoadError(error?.message || "Resume list could not be loaded.");
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialResumes() {
      try {
        const ownedResumes = await listResumes({ signal: controller.signal });
        if (!controller.signal.aborted) {
          setResumes(ownedResumes);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error?.message || "Resume list could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialResumes();
    return () => controller.abort();
  }, []);

  async function handleFile(file) {
    const validationError = validateResumeFile(file);

    if (validationError) {
      setUploadError(validationError);
      setUploadMessage("");
      return;
    }

    if (uploadInFlightRef.current) {
      return;
    }

    uploadInFlightRef.current = true;
    setIsUploading(true);
    setUploadError("");
    setUploadMessage("Reading your resume…");

    try {
      const uploadedResume = await uploadResume(file);
      setResumes((currentResumes) => [
        uploadedResume,
        ...currentResumes.filter((resume) => resume.id !== uploadedResume.id),
      ]);
      setUploadMessage(
        uploadedResume.extractionStatus === "completed"
          ? "Resume uploaded and ready to use."
          : "Resume uploaded, but text could not be read. Upload another PDF or continue without resume context.",
      );
    } catch (error) {
      setUploadMessage("");
      setUploadError(
        `${error?.message || "Resume could not be uploaded."} Choose the file and try again, or continue without resume context.`,
      );
    } finally {
      uploadInFlightRef.current = false;
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleDrop(event) {
    event.preventDefault();

    if (!isUploading) {
      handleFile(event.dataTransfer.files?.[0]);
    }
  }

  return (
    <>
      <section className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Resumes</p>
          <h1>Keep resume context optional.</h1>
          <p className="page-description">
            Upload a PDF to tailor questions, or practise normally without one.
          </p>
        </div>
      </section>

      <Card className="resume-upload-card">
        <div
          className={`resume-drop-zone${isUploading ? " is-disabled" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <FileUp aria-hidden="true" className="empty-icon" />
          <h2>Upload resume</h2>
          <p>Drop one PDF here, or choose a file. Maximum size: 5 MiB.</p>
          <label className="button resume-file-label">
            Choose PDF
            <input
              accept="application/pdf,.pdf"
              disabled={isUploading}
              onChange={(event) => handleFile(event.target.files?.[0])}
              ref={fileInputRef}
              type="file"
            />
          </label>
        </div>
      </Card>

      {isUploading ? (
        <InlineAlert>
          <span className="alert-row">
            <Loader2 aria-hidden="true" size={18} />
            Reading your resume…
          </span>
        </InlineAlert>
      ) : null}
      {uploadError ? (
        <InlineAlert tone="error">{uploadError}</InlineAlert>
      ) : null}
      {!isUploading && uploadMessage ? (
        <InlineAlert>{uploadMessage}</InlineAlert>
      ) : null}

      <section
        className="resume-list-section"
        aria-labelledby="resume-list-title"
      >
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Your uploads</p>
            <h2 id="resume-list-title">Resume list</h2>
          </div>
          <Link className="text-link" to="/practice">
            Continue without a resume
          </Link>
        </div>

        {isLoading ? (
          <p className="loading-state" role="status">
            <span aria-hidden="true" className="loading-indicator" />
            Loading resumes…
          </p>
        ) : null}

        {!isLoading && loadError ? (
          <InlineAlert tone="error">
            <span>{loadError}</span>
            <Button
              className="inline-alert-action"
              onClick={() => loadResumeList()}
            >
              Retry list
            </Button>
          </InlineAlert>
        ) : null}

        {!isLoading && !loadError && resumes.length === 0 ? (
          <Card className="empty-state resume-placeholder">
            <FileText aria-hidden="true" className="empty-icon" />
            <h2>No resumes uploaded</h2>
            <p>Interview practice will always work without a resume.</p>
          </Card>
        ) : null}

        {!isLoading && !loadError && resumes.length > 0 ? (
          <div className="resume-list">
            {resumes.map((resume) => (
              <Card className="resume-list-item" key={resume.id}>
                <div>
                  <h3>{resume.originalName}</h3>
                  <p>
                    Uploaded {formatUploadDate(resume.createdAt)} ·{" "}
                    {(resume.sizeBytes / 1024).toFixed(1)} KiB
                  </p>
                </div>
                <div className="resume-list-actions">
                  <span
                    className={`resume-status resume-status--${resume.extractionStatus}`}
                  >
                    {statusLabel(resume.extractionStatus)}
                  </span>
                  {resume.extractionStatus === "completed" ? (
                    <Link
                      className="text-link"
                      to={`/practice?resumeId=${encodeURIComponent(resume.id)}`}
                    >
                      Use in interview
                    </Link>
                  ) : (
                    <span className="resume-unavailable">
                      Upload another PDF or continue without one.
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}

export default ResumesPage;
