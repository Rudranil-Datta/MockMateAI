import { useEffect, useState } from "react";
import { FolderKanban, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import {
  createProject,
  deleteProject,
  extractProjectDrafts,
  getProject,
  listProjects,
  updateProject,
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
    name: project.name,
    responsibilities: project.responsibilities.join("\n"),
    role: project.role,
    summary: project.summary,
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
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setIsConfirmed(false);
  }

  async function handleExtract() {
    if (!sourceResumeId) {
      setError("Choose a ready resume first.");
      return;
    }
    setError("");
    setNotice("");
    setIsExtracting(true);
    try {
      const suggestions = await extractProjectDrafts({
        idempotencyKey: operationId(),
        resumeId: sourceResumeId,
      });
      setDrafts(suggestions);
      setNotice(
        suggestions.length
          ? "Suggestions are not saved. Review every fact before confirming."
          : "No complete project suggestion was found. You can enter one manually.",
      );
    } catch (requestError) {
      setError(
        requestError?.message || "Project suggestions could not be extracted.",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isConfirmed) {
      setError("Confirm that you reviewed every project fact before saving.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      await onSave(toPayload(form, sourceResumeId));
    } catch (requestError) {
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
        <label>
          Resume source (optional)
          <select
            value={sourceResumeId}
            onChange={(event) => {
              setSourceResumeId(event.target.value);
              setIsConfirmed(false);
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
      </Card>

      {notice ? <InlineAlert>{notice}</InlineAlert> : null}
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      {drafts.length ? (
        <section aria-labelledby="drafts-title">
          <h2 id="drafts-title">Unconfirmed suggestions</h2>
          <div className="project-draft-grid">
            {drafts.map((draft, index) => (
              <Card key={`${draft.name}-${index}`}>
                <h3>{draft.name}</h3>
                <p>{draft.summary}</p>
                <Button
                  onClick={() => {
                    setForm(toForm(draft));
                    setSourceResumeId(draft.sourceResumeId);
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

      <Card className="project-fields">
        <label>
          Project name
          <input
            name="name"
            required
            minLength="2"
            maxLength="120"
            value={form.name}
            onChange={updateField}
          />
        </label>
        <label>
          Your role
          <input
            name="role"
            required
            minLength="2"
            maxLength="120"
            value={form.role}
            onChange={updateField}
          />
        </label>
        <label className="project-wide-field">
          Summary
          <textarea
            name="summary"
            required
            minLength="20"
            maxLength="1000"
            rows="4"
            value={form.summary}
            onChange={updateField}
          />
        </label>
        {[
          ["technologies", "Technologies", "One technology per line"],
          [
            "responsibilities",
            "Responsibilities",
            "One responsibility per line",
          ],
          ["architecture", "Architecture", "One architecture fact per line"],
          ["decisions", "Decisions (optional)", "One decision per line"],
          ["tradeoffs", "Trade-offs (optional)", "One trade-off per line"],
          ["claims", "Claims (optional)", "One per line: claim | evidence"],
        ].map(([name, label, help]) => (
          <label key={name}>
            {label}
            <textarea
              name={name}
              rows="4"
              value={form[name]}
              onChange={updateField}
            />
            <span className="field-help">{help}</span>
          </label>
        ))}
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
          onSave={async (payload) => {
            if (projectId) await updateProject(projectId, payload);
            else await createProject(payload);
            navigate("/projects", { replace: true });
          }}
        />
      ) : null}

      {!isLoading && !loadError && !isEditor && projects.length === 0 ? (
        <Card className="empty-state">
          <FolderKanban aria-hidden="true" className="empty-icon" />
          <h2>No confirmed projects</h2>
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
                <h2>{item.name}</h2>
                <p>
                  {item.role} · {item.technologies.join(", ")}
                </p>
                <p>{item.summary}</p>
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
