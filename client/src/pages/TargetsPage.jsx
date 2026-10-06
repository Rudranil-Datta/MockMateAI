import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  createJobTarget,
  deleteJobTarget,
  listJobTargets,
  updateJobTarget,
} from "../api/jobTargetApi.js";
import Button from "../components/common/Button.jsx";
import Card from "../components/common/Card.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import LoadingState from "../components/common/LoadingState.jsx";

function operationId() {
  return globalThis.crypto.randomUUID();
}

const emptyDraft = { company: "", description: "", title: "" };

function TargetsPage() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const keyRef = useRef(operationId());

  const loadTargets = useCallback(async () => {
    setError("");
    setIsLoading(true);
    try {
      setItems(await listJobTargets());
    } catch (requestError) {
      setError(requestError?.message || "Job Targets could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadTargets);
  }, [loadTargets]);

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
    keyRef.current = operationId();
  }

  async function saveTarget(event) {
    event.preventDefault();
    if (
      draft.title.trim().length < 2 ||
      draft.description.trim().length < 100
    ) {
      setError("Add a title and at least 100 characters of job description.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const payload = {
        ...draft,
        idempotencyKey: keyRef.current,
      };
      const target = editingId
        ? await updateJobTarget({ ...payload, targetId: editingId })
        : await createJobTarget(payload);
      setItems((current) => [
        target,
        ...current.filter(({ id }) => id !== target.id),
      ]);
      setDraft(emptyDraft);
      setEditingId("");
      keyRef.current = operationId();
    } catch (requestError) {
      setError(
        `${requestError?.message || "Job Target could not be saved."} Your draft is still here.`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  function editTarget(target) {
    setDraft({
      company: target.company || "",
      description: target.description,
      title: target.title,
    });
    setEditingId(target.id);
    setError("");
    keyRef.current = operationId();
  }

  function cancelEdit() {
    setDraft(emptyDraft);
    setEditingId("");
    setError("");
    keyRef.current = operationId();
  }

  async function reanalyzeTarget(target) {
    setIsSaving(true);
    setError("");
    try {
      const updatedTarget = await updateJobTarget({
        company: target.company || "",
        description: target.description,
        idempotencyKey: operationId(),
        targetId: target.id,
        title: target.title,
      });
      setItems((current) =>
        current.map((item) =>
          item.id === updatedTarget.id ? updatedTarget : item,
        ),
      );
    } catch (requestError) {
      setError(requestError?.message || "Job Target could not be reanalyzed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeTarget(target) {
    if (
      !window.confirm(
        `Delete ${target.title}? Saved interview snapshots remain.`,
      )
    )
      return;
    setDeletingId(target.id);
    setError("");
    try {
      await deleteJobTarget(target.id);
      setItems((current) => current.filter(({ id }) => id !== target.id));
    } catch (requestError) {
      setError(requestError?.message || "Job Target could not be deleted.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <>
      <section className="page-heading compact-heading">
        <div>
          <p className="eyebrow">Preparation workspace</p>
          <h1>Job Targets</h1>
          <p className="page-description">
            Save a role to ground future Role Simulations.
          </p>
        </div>
        <Link className="button button--secondary" to="/practice">
          Open practice
        </Link>
      </section>
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
      <div className="workspace-grid">
        <Card className="workspace-form-card">
          <p className="eyebrow">{editingId ? "Edit target" : "New target"}</p>
          <h2>{editingId ? "Review role details" : "Add a role"}</h2>
          <form className="form-stack" onSubmit={saveTarget}>
            <label htmlFor="target-title">Role title</label>
            <input
              id="target-title"
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
            />
            <label htmlFor="target-company">
              Company <span className="field-optional">optional</span>
            </label>
            <input
              id="target-company"
              value={draft.company}
              onChange={(event) => updateDraft("company", event.target.value)}
            />
            <label htmlFor="target-description">Job description</label>
            <textarea
              id="target-description"
              rows="8"
              value={draft.description}
              onChange={(event) =>
                updateDraft("description", event.target.value)
              }
            />
            <Button
              isLoading={isSaving}
              loadingLabel={editingId ? "Analyzing target..." : "Analyzing target..."}
              type="submit"
            >
              {editingId ? "Save and reanalyze" : "Save and analyze"}
            </Button>
            {editingId ? (
              <Button className="button--secondary" onClick={cancelEdit} type="button">
                Cancel edit
              </Button>
            ) : null}
          </form>
        </Card>
        <section aria-label="Saved Job Targets" className="workspace-list">
          {isLoading ? <LoadingState label="Loading Job Targets..." /> : null}
          {!isLoading && items.length === 0 ? (
            <Card className="empty-state">
              <h2>No Job Targets yet</h2>
              <p>Add a role to unlock Role Simulation context.</p>
            </Card>
          ) : null}
          {!isLoading &&
            items.map((target) => (
              <Card className="workspace-item" key={target.id}>
                <div>
                  <span className={`semantic-chip semantic-chip--${target.status === "ready" ? "success" : target.status === "analysis_failed" ? "error" : "attention"}`}>
                    {target.status === "ready" ? "Ready for Role Simulation" : target.status.replaceAll("_", " ")}
                  </span>
                  <h2>{target.title}</h2>
                  <p>{target.company || "Independent preparation"}</p>
                  {target.analysis ? (
                    <div className="target-analysis">
                      <p>{target.analysis.roleSummary}</p>
                      <p>
                        Requirements: {target.analysis.requirements.map(({ label, priority }) => `${label} (${priority})`).join(", ")}
                      </p>
                      <p>
                        Weighted skills: {target.analysis.skills.map(({ label, weight }) => `${label} (${weight}/5)`).join(", ")}
                      </p>
                    </div>
                  ) : (
                    <p className="field-help">
                      {target.status === "analysis_failed"
                        ? "Analysis did not finish. Edit and retry when ready."
                        : "Analysis is still preparing role requirements."}
                    </p>
                  )}
                </div>
                <div className="workspace-item-actions">
                  {target.status === "ready" ? (
                    <Link
                      className="text-link"
                      to={`/practice?type=${encodeURIComponent("Role Simulation")}&targetId=${target.id}`}
                    >
                      Role Simulation
                    </Link>
                  ) : null}
                  <Button className="button--secondary" onClick={() => editTarget(target)}>
                    Edit
                  </Button>
                  <Button
                    className="button--secondary"
                    disabled={isSaving}
                    isLoading={isSaving}
                    loadingLabel="Reanalyzing…"
                    onClick={() => reanalyzeTarget(target)}
                  >
                    {target.status === "analysis_failed" ? "Retry analysis" : "Reanalyze"}
                  </Button>
                  <Button
                    className="button--secondary"
                    isLoading={deletingId === target.id}
                    onClick={() => removeTarget(target)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          {!isLoading && error ? (
            <Button className="button--secondary" onClick={loadTargets}>
              Retry
            </Button>
          ) : null}
        </section>
      </div>
    </>
  );
}

export default TargetsPage;
