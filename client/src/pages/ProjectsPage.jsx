import { useEffect, useRef, useState } from "react";
import { FolderKanban, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import {
  createProject,
  createPartialProject,
  deleteProject,
  extractProjectDrafts,
  importReadmeDraft,
  getProject,
  listProjects,
  updateProject,
  updatePartialProject,
} from "../api/projectApi.js";
import { listResumes } from "../api/resumeApi.js";
import Button from "../components/common/Button.jsx";
import Card from "../components/common/Card.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";

const emptyForm = {
  architecture: "",
  claims: "",
  decisions: "",
  name: "",
  responsibilities: "",
  role: "",
  summary: "",
  technologies: "",
  tradeoffs: "",
};

const projectFieldNames = new Set([
  "name",
  "summary",
  "role",
  "technologies",
  "responsibilities",
  "architecture",
  "decisions",
  "tradeoffs",
  "claims",
]);

function safeFieldErrors(fields) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return {};
  return Object.fromEntries(
    Object.entries(fields).flatMap(([key, message]) => {
      const field = key.split(".")[0];
      return projectFieldNames.has(field) &&
        typeof message === "string" &&
        message.length <= 300
        ? [[field, message]]
        : [];
    }),
  );
}

function operationId() {
  return (
    globalThis.crypto?.randomUUID?.() || "00000000-0000-4000-8000-000000000001"
  );
}

function lines(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toForm(project) {
  return {
    architecture: project.architecture.join("\n"),
    claims: project.claims
      .map(({ evidence, text }) => `${text}${evidence ? ` | ${evidence}` : ""}`)
      .join("\n"),
    decisions: project.decisions.join("\n"),
    name: project.name || "",
    responsibilities: project.responsibilities.join("\n"),
    role: project.role || "",
    summary: project.summary || "",
    technologies: project.technologies.join("\n"),
    tradeoffs: project.tradeoffs.join("\n"),
  };
}

function toPayload(form, sourceResumeId) {
  return {
    architecture: lines(form.architecture),
    claims: lines(form.claims).map((line) => {
      const [text, ...evidence] = line.split("|");
      const evidenceText = evidence.join("|").trim();
      return { evidence: evidenceText || null, text: text.trim() };
    }),
    decisions: lines(form.decisions),
    name: form.name.trim(),
    responsibilities: lines(form.responsibilities),
    role: form.role.trim(),
    ...(sourceResumeId ? { sourceResumeId } : {}),
    summary: form.summary.trim(),
    technologies: lines(form.technologies),
    tradeoffs: lines(form.tradeoffs),
  };
}

function toPartialPayload(form, sourceResumeId) {
  const payload = toPayload(form, sourceResumeId);
  return {
    ...payload,
    name: payload.name || null,
    role: payload.role || null,
    summary: payload.summary || null,
  };
}

function ProjectForm({ initialProject, resumes, onSave, saveLabel }) {
  const [form, setForm] = useState(() =>
    initialProject ? toForm(initialProject) : emptyForm,
  );
  const [sourceResumeId, setSourceResumeId] = useState(
    initialProject?.sourceResumeId || "",
  );
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState("");
  const [extractionError, setExtractionError] = useState("");
  const [notice, setNotice] = useState("");
  const [isImportingReadme, setIsImportingReadme] = useState(false);
  const [readmeFile, setReadmeFile] = useState(null);
  const [readmeImportError, setReadmeImportError] = useState("");
  const [readmeReview, setReadmeReview] = useState(null);

  async function handleReadme(file = readmeFile) {
    if (
      !file ||
      !/\.(md|markdown|txt)$/i.test(file.name) ||
      !["text/markdown", "text/x-markdown", "text/plain"].includes(file.type) ||
      file.size < 1 ||
      file.size > 256 * 1024
    ) {
      setReadmeImportError(
        "Choose one Markdown or text README file up to 256 KiB.",
      );
      return;
    }
    setReadmeImportError("");
    setNotice("");
    setIsImportingReadme(true);
    try {
      const { draft, review } = await importReadmeDraft(file);
      setDrafts((current) => [...current, draft]);
      setReadmeReview(review);
      setReadmeFile(null);
      setNotice(
        "README draft is not saved. Review every fact before confirming.",
      );
    } catch (requestError) {
      setReadmeImportError(
        requestError?.message || "README could not be imported.",
      );
    } finally {
      setIsImportingReadme(false);
    }
  }
  const extractionAttemptRef = useRef(null);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const { [name]: _fieldError, ...remaining } = current;
      return remaining;
    });
    setIsConfirmed(false);
  }

  async function handleExtract() {
    if (!sourceResumeId) {
      setError("Choose a ready resume first.");
      return;
    }
    const attempt =
      extractionAttemptRef.current?.resumeId === sourceResumeId
        ? extractionAttemptRef.current
        : {
            idempotencyKey: operationId(),
            resumeId: sourceResumeId,
          };
    extractionAttemptRef.current = attempt;
    setError("");
    setExtractionError("");
    setNotice("");
    setIsExtracting(true);
    try {
      const suggestions = await extractProjectDrafts({
        idempotencyKey: attempt.idempotencyKey,
        resumeId: sourceResumeId,
      });
      setDrafts(suggestions);
      extractionAttemptRef.current = null;
      setNotice(
        suggestions.length
          ? "Suggestions are not saved. Review every fact before confirming."
          : "No complete project suggestion was found. You can enter one manually.",
      );
    } catch (requestError) {
      setExtractionError(
        requestError?.message || "Project suggestions could not be extracted.",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSubmit(event, partial = false) {
    event.preventDefault();
    if (!isConfirmed) {
      setError("Confirm that you reviewed every project fact before saving.");
      return;
    }
    setError("");
    setFieldErrors({});
    setIsSaving(true);
    try {
      await onSave(
        partial
          ? toPartialPayload(form, sourceResumeId)
          : toPayload(form, sourceResumeId),
        partial,
      );
    } catch (requestError) {
      setFieldErrors(safeFieldErrors(requestError?.fields));
      setError(
        requestError?.message ||
          "Project could not be saved. Your edits are still here.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <Card className="project-source-card">
        <div className="project-source-resume">
          <label>
            Resume source (optional)
            <select
              value={sourceResumeId}
              onChange={(event) => {
                setSourceResumeId(event.target.value);
                setIsConfirmed(false);
                setExtractionError("");
                extractionAttemptRef.current = null;
              }}
            >
              <option value="">Enter project manually</option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.originalName}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={!sourceResumeId}
            isLoading={isExtracting}
            loadingLabel="Extracting suggestions…"
            onClick={handleExtract}
          >
            <Sparkles aria-hidden="true" size={17} />
            Suggest from resume
          </Button>
        </div>
        <div className="project-source-readme">
          <label>
            Import project README (optional)
            <span className="field-help" id="readme-import-help">
              Choose one Markdown or text file up to 256 KiB and 100,000 decoded
              characters.
            </span>
            <input
              accept="text/markdown,text/x-markdown,text/plain,.md,.markdown,.txt"
              aria-describedby="readme-import-help"
              aria-label="Import project README"
              disabled={isImportingReadme}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                setReadmeFile(file || null);
                void handleReadme(file);
              }}
              type="file"
            />
          </label>
        </div>
        {isImportingReadme ? <p role="status">Importing README…</p> : null}
      </Card>

      {notice ? <InlineAlert>{notice}</InlineAlert> : null}
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
      {readmeImportError ? (
        <InlineAlert tone="error">
          <span>{readmeImportError}</span>
          {readmeFile ? (
            <Button
              isLoading={isImportingReadme}
              loadingLabel="Retrying README import…"
              onClick={() => handleReadme()}
            >
              Retry README import
            </Button>
          ) : null}
        </InlineAlert>
      ) : null}
      {extractionError ? (
        <InlineAlert tone="error">
          <span>{extractionError}</span>
          <Button
            isLoading={isExtracting}
            loadingLabel="Retrying suggestions…"
            onClick={handleExtract}
          >
            Retry suggestions
          </Button>
        </InlineAlert>
      ) : null}

      {drafts.length ? (
        <section aria-labelledby="drafts-title">
          <h2 id="drafts-title">Unconfirmed suggestions</h2>
          <div className="project-draft-grid">
            {drafts.map((draft, index) => (
              <Card key={`${draft.name || "draft"}-${index}`}>
                <h3>{draft.name || "Untitled project draft"}</h3>
                <p>{draft.summary || "No summary extracted."}</p>
                {draft.missingFields ? (
                  <p>Missing: {draft.missingFields.join(", ") || "none"}</p>
                ) : null}
                <Button
                  onClick={() => {
                    setForm(toForm(draft));
                    setSourceResumeId(draft.sourceResumeId || "");
                    setIsConfirmed(false);
                  }}
                >
                  Review this draft
                </Button>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
      {readmeReview ? (
        <Card>
          <h2>README import review</h2>
          <p>
            Recognized: {readmeReview.recognizedSections.join(", ") || "none"}
          </p>
          <p>Missing: {readmeReview.missingFields.join(", ") || "none"}</p>
          <p>Omitted unmatched lines: {readmeReview.omittedLineCount}</p>
          {readmeReview.unmatchedText ? (
            <pre>{readmeReview.unmatchedText}</pre>
          ) : null}
        </Card>
      ) : null}

      <Card className="project-fields">
        <label>
          Project name
          <input
            aria-describedby={
              fieldErrors.name ? "project-name-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.name)}
            name="name"
            required
            minLength="2"
            maxLength="120"
            value={form.name}
            onChange={updateField}
          />
          {fieldErrors.name ? (
            <span className="field-error" id="project-name-error">
              {fieldErrors.name}
            </span>
          ) : null}
        </label>
        <label>
          Your role
          <input
            aria-describedby={
              fieldErrors.role ? "project-role-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.role)}
            name="role"
            required
            minLength="2"
            maxLength="120"
            value={form.role}
            onChange={updateField}
          />
          {fieldErrors.role ? (
            <span className="field-error" id="project-role-error">
              {fieldErrors.role}
            </span>
          ) : null}
        </label>
        <label className="project-wide-field">
          Summary
          <textarea
            aria-label="Summary"
            aria-describedby={
              fieldErrors.summary ? "project-summary-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.summary)}
            name="summary"
            required
            minLength="20"
            maxLength="1000"
            rows="4"
            value={form.summary}
            onChange={updateField}
          />
          <span className="field-help">20–1,000 characters</span>
          {fieldErrors.summary ? (
            <span className="field-error" id="project-summary-error">
              {fieldErrors.summary}
            </span>
          ) : null}
        </label>
        {[
          [
            "technologies",
            "Technologies",
            "One technology per line, 1–50 characters each",
          ],
          [
            "responsibilities",
            "Responsibilities",
            "One responsibility per line, 20–600 characters each",
          ],
          [
            "architecture",
            "Architecture",
            "One architecture fact per line, 20–600 characters each",
          ],
          [
            "decisions",
            "Decisions (optional)",
            "One decision per line, 20–600 characters each",
          ],
          [
            "tradeoffs",
            "Trade-offs (optional)",
            "One trade-off per line, 20–600 characters each",
          ],
          [
            "claims",
            "Claims (optional)",
            "One per line: claim | evidence; each side 20–600 characters",
          ],
        ].map(([name, label, help]) => (
          <label key={name}>
            {label}
            <textarea
              aria-label={label.replace(" (optional)", "")}
              aria-describedby={
                fieldErrors[name] ? `project-${name}-error` : undefined
              }
              aria-invalid={Boolean(fieldErrors[name])}
              name={name}
              rows="4"
              value={form[name]}
              onChange={updateField}
            />
            <span className="field-help">{help}</span>
            {fieldErrors[name] ? (
              <span className="field-error" id={`project-${name}-error`}>
                {fieldErrors[name]}
              </span>
            ) : null}
          </label>
        ))}
        <p className="field-help project-wide-field">
          Repeated items are not allowed.
        </p>
      </Card>

      <label className="project-confirmation">
        <input
          checked={isConfirmed}
          onChange={(event) => setIsConfirmed(event.target.checked)}
          type="checkbox"
        />
        I reviewed these facts and confirm they accurately describe my project.
      </label>
      <div className="project-actions">
        <Button isLoading={isSaving} loadingLabel="Saving…" type="submit">
          {saveLabel}
        </Button>
        <Button
          isLoading={isSaving}
          loadingLabel="Saving…"
          onClick={(event) => {
            event.preventDefault();
            void handleSubmit(event, true);
          }}
          type="button"
        >
          Save incomplete project
        </Button>
        <Link className="text-link" to="/projects">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function ProjectsPage() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isNew = location.pathname === "/projects/new";
  const isEditor = isNew || Boolean(projectId);
  const [projects, setProjects] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [loadVersion, setLoadVersion] = useState(0);
  const [isRetryingResumes, setIsRetryingResumes] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setLoadError("");
      setResumeError("");
      try {
        if (isEditor) {
          const selectedProject = projectId
            ? await getProject(projectId, { signal: controller.signal })
            : null;
          setProject(selectedProject);
          try {
            const ownedResumes = await listResumes({
              signal: controller.signal,
            });
            setResumes(
              ownedResumes.filter(
                ({ extractionStatus }) => extractionStatus === "completed",
              ),
            );
          } catch (requestError) {
            if (!controller.signal.aborted) {
              setResumeError(
                requestError?.message ||
                  "Resume sources could not be loaded. You can still enter project facts manually.",
              );
            }
          }
        } else {
          setProjects(await listProjects({ signal: controller.signal }));
        }
      } catch (requestError) {
        if (!controller.signal.aborted)
          setLoadError(
            requestError?.message || "Projects could not be loaded.",
          );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [isEditor, loadVersion, projectId]);

  async function handleDelete(selectedProject) {
    if (
      !window.confirm(
        `Delete ${selectedProject.name}? Existing interview snapshots will remain.`,
      )
    )
      return;
    setDeletingId(selectedProject.id);
    setActionError("");
    try {
      await deleteProject(selectedProject.id);
      setProjects((items) =>
        items.filter(({ id }) => id !== selectedProject.id),
      );
    } catch (requestError) {
      setActionError(requestError?.message || "Project could not be deleted.");
    } finally {
      setDeletingId("");
    }
  }

  async function handleRetryResumes() {
    setIsRetryingResumes(true);
    setResumeError("");
    try {
      const ownedResumes = await listResumes();
      setResumes(
        ownedResumes.filter(
          ({ extractionStatus }) => extractionStatus === "completed",
        ),
      );
    } catch (requestError) {
      setResumeError(
        requestError?.message ||
          "Resume sources could not be loaded. You can still enter project facts manually.",
      );
    } finally {
      setIsRetryingResumes(false);
    }
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Confirmed projects</p>
          <h1>
            {isEditor
              ? projectId
                ? "Review project facts"
                : "Add a project"
              : "Your project evidence"}
          </h1>
          <p className="page-description">
            Only facts you explicitly confirm can be used for future Project
            Defense practice.
          </p>
        </div>
        {!isEditor ? (
          <Link className="button" to="/projects/new">
            Add project
          </Link>
        ) : null}
      </section>

      {isLoading ? (
        <p className="loading-state" role="status">
          <span aria-hidden="true" className="loading-indicator" />
          Loading projects…
        </p>
      ) : null}
      {!isLoading && loadError ? (
        <InlineAlert tone="error">
          <span>{loadError}</span>
          <Button onClick={() => setLoadVersion((version) => version + 1)}>
            Retry
          </Button>
        </InlineAlert>
      ) : null}
      {!isLoading && resumeError ? (
        <InlineAlert tone="error">
          <span>{resumeError}</span>
          <Button
            isLoading={isRetryingResumes}
            loadingLabel="Retrying…"
            onClick={handleRetryResumes}
          >
            Retry resumes
          </Button>
        </InlineAlert>
      ) : null}
      {!isLoading && actionError ? (
        <InlineAlert tone="error">{actionError}</InlineAlert>
      ) : null}

      {!isLoading && !loadError && isEditor ? (
        <ProjectForm
          initialProject={project}
          resumes={resumes}
          saveLabel={projectId ? "Confirm and update" : "Confirm and save"}
          onSave={async (payload, partial) => {
            if (projectId) {
              if (partial) await updatePartialProject(projectId, payload);
              else await updateProject(projectId, payload);
            } else if (partial) await createPartialProject(payload);
            else await createProject(payload);
            navigate("/projects", { replace: true });
          }}
        />
      ) : null}

      {!isLoading && !loadError && !isEditor && projects.length === 0 ? (
        <Card className="empty-state">
          <FolderKanban aria-hidden="true" className="empty-icon" />
          <h2>No projects yet</h2>
          <p>
            Add one manually or use a ready resume to create editable
            suggestions.
          </p>
          <Link className="button" to="/projects/new">
            Add your first project
          </Link>
        </Card>
      ) : null}

      {!isLoading && !loadError && !isEditor && projects.length > 0 ? (
        <div className="project-list">
          {projects.map((item) => (
            <Card className="project-list-item" key={item.id}>
              <div>
                <span
                  className={
                    item.status !== "partial"
                      ? "semantic-chip semantic-chip--success"
                      : "semantic-chip"
                  }
                >
                  {item.status === "partial" ? "Incomplete" : "Ready"}
                </span>
                <h2>{item.name || "Untitled incomplete project"}</h2>
                <p>
                  {[item.role, item.technologies.join(", ")]
                    .filter(Boolean)
                    .join(" · ") || "Add project details to continue."}
                </p>
                <p>{item.summary || "No summary yet."}</p>
                <p className="field-help">
                  {item.status !== "partial"
                    ? "Available for Project Defense."
                    : "Complete and confirm this project before Project Defense."}
                </p>
              </div>
              <div className="project-actions">
                <Link className="text-link" to={`/projects/${item.id}/edit`}>
                  Edit
                </Link>
                <Button
                  disabled={Boolean(deletingId)}
                  isLoading={deletingId === item.id}
                  loadingLabel="Deleting…"
                  onClick={() => handleDelete(item)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </>
  );
}

export default ProjectsPage;
