import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import { getCoachRoadmap } from "../../api/coachApi.js";
import Button from "../common/Button.jsx";
import Card from "../common/Card.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import LoadingState from "../common/LoadingState.jsx";

function contextValue(context) {
  return context.id ? `${context.kind}:${context.id}` : context.kind;
}

function parseContext(value) {
  if (value === "overall") return { kind: "overall" };
  const [kind, id] = value.split(":", 2);
  return id && ["target", "project"].includes(kind) ? { id, kind } : { kind: "overall" };
}

function getErrorState(error) {
  if (error?.code === "COACH_CONTEXT_UNAVAILABLE") {
    return "Selected context is unavailable. Choose another context and try again.";
  }
  if (error?.code === "COACH_MALFORMED_RESPONSE") return error.message;
  return "Coach could not be loaded. Please try again.";
}

function SkillList({ skills }) {
  if (!skills.length) {
    return <p className="coach-empty">No skill evidence yet. Choose an action to begin.</p>;
  }
  return (
    <ul className="coach-skill-list" aria-label="Coach skill evidence">
      {skills.map((skill) => (
        <li key={skill.skillKey}>
          <strong>{skill.skillLabel}</strong>
          <span>
            {skill.evidenceCount === 0
              ? "No evidence yet"
              : `${skill.masteryScore}/100 · ${skill.confidence}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ActionList({ actions }) {
  return (
    <ul className="coach-action-list" aria-label="Coach roadmap actions">
      {actions.map((item) => (
        <li key={`${item.type}:${item.to}`}>
          <Link className="text-link" to={item.to}>
            {item.label} <ArrowRight aria-hidden="true" size={16} />
          </Link>
          <span>{item.description}</span>
        </li>
      ))}
    </ul>
  );
}

function CoachPanel({ context: sharedContext, onContextChange, projects, targets }) {
  const [localContext, setLocalContext] = useState({ kind: "overall" });
  const context = sharedContext || localContext;
  const [roadmap, setRoadmap] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const controllerRef = useRef(null);
  const requestIdRef = useRef(0);

  const loadRoadmap = useCallback(async (nextContext = context) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    controllerRef.current = controller;
    requestIdRef.current = requestId;
    setError("");
    setIsLoading(true);

    try {
      const value = await getCoachRoadmap({
        context: nextContext.kind,
        projectId: nextContext.kind === "project" ? nextContext.id : undefined,
        signal: controller.signal,
        targetId: nextContext.kind === "target" ? nextContext.id : undefined,
      });
      if (requestIdRef.current === requestId && !controller.signal.aborted) {
        setRoadmap(value);
      }
    } catch (requestError) {
      if (requestIdRef.current === requestId && !controller.signal.aborted) {
        setRoadmap(null);
        setError(getErrorState(requestError));
      }
    } finally {
      if (requestIdRef.current === requestId && !controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [context]);

  useEffect(() => {
    void Promise.resolve().then(() => loadRoadmap(context));
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [context, loadRoadmap]);

  function changeContext(event) {
    const next = parseContext(event.target.value);
    if (onContextChange) onContextChange(next);
    else setLocalContext(next);
  }

  return (
    <Card className="dashboard-panel coach-panel">
      <div className="dashboard-panel-heading">
        <div>
          <p className="eyebrow">Evidence-backed Coach</p>
          <h2>Your roadmap</h2>
        </div>
        <RefreshCw aria-hidden="true" className="section-icon" />
      </div>
      <label className="coach-context-label" htmlFor="coach-context">
        Preparation context
      </label>
      <select id="coach-context" onChange={changeContext} value={contextValue(context)}>
        <option value="overall">Overall preparation</option>
        {targets
          .filter((target) => target.status === "ready")
          .map((target) => (
            <option key={target.id} value={`target:${target.id}`}>
              Job Target: {target.title}
              {target.company ? ` at ${target.company}` : ""}
            </option>
          ))}
        {projects.map((project) => (
          <option key={project.id} value={`project:${project.id}`}>
            Project: {project.name}
          </option>
        ))}
      </select>

      {isLoading ? <LoadingState label="Loading Coach roadmap…" /> : null}
      {!isLoading && error ? (
        <div className="coach-recovery">
          <InlineAlert tone="error">{error}</InlineAlert>
          <Button onClick={() => loadRoadmap()}>Retry Coach</Button>
        </div>
      ) : null}
      {!isLoading && roadmap ? (
        <div className="coach-content">
          <p className="coach-context-name">{roadmap.context.label}</p>
          {roadmap.evidenceSyncStatus === "pending" ? (
            <InlineAlert tone="info">
              Evidence is still syncing. Roadmap uses currently saved evidence.
            </InlineAlert>
          ) : null}
          <SkillList skills={roadmap.skills} />
          <ActionList actions={roadmap.actions} />
        </div>
      ) : null}
    </Card>
  );
}

export default CoachPanel;
