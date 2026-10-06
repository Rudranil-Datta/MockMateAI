import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  createJobTarget,
  deleteJobTarget,
  listJobTargets,
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
      const target = await createJobTarget({
        ...draft,
        idempotencyKey: keyRef.current,
      });
      setItems((current) => [
        target,
        ...current.filter(({ id }) => id !== target.id),
      ]);
      setDraft(emptyDraft);
      keyRef.current = operationId();
    } catch (requestError) {
      setError(
        `${requestError?.message || "Job Target could not be saved."} Your draft is still here.`,
      );
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
          <p className="eyebrow">New target</p>
          <h2>Add a role</h2>
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
              loadingLabel="Analyzing target..."
              type="submit"
            >
              Save and analyze
            </Button>
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
                  <p className="eyebrow">
                    {target.status.replaceAll("_", " ")}
                  </p>
                  <h2>{target.title}</h2>
                  <p>{target.company || "Independent preparation"}</p>
                </div>
                <div className="workspace-item-actions">
                  <Link
                    className="text-link"
                    to={`/practice?targetId=${target.id}`}
                  >
                    Practice this role
                  </Link>
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
