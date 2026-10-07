import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getInterviewPlan } from "../../api/interviewPlanApi.js";
import Button from "../common/Button.jsx";
import Card from "../common/Card.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import LoadingState from "../common/LoadingState.jsx";

function errorMessage(error) {
  if (error?.code === "INTERVIEW_PLAN_MALFORMED_RESPONSE") return error.message;
  if (["JOB_TARGET_NOT_FOUND", "PROJECT_NOT_FOUND", "RESUME_CONTEXT_UNAVAILABLE", "SKILL_NOT_FOUND"].includes(error?.code)) return "Selected planning context is unavailable. Adjust your choices and try again.";
  return "Interview plan could not be loaded. Your choices are still here.";
}

function InterviewPlannerPreview({ onReadyChange, selection }) {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(selection));
  const controllerRef = useRef(null);
  const requestRef = useRef(0);
  const selectionKey = JSON.stringify(selection || {});
  const normalizedSelection = useMemo(
    () => (selectionKey === "{}" ? null : JSON.parse(selectionKey)),
    [selectionKey],
  );
  const load = useCallback(async () => {
    if (!normalizedSelection) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    const request = ++requestRef.current;
    controllerRef.current = controller;
    setPlan(null); setError(""); setIsLoading(true); onReadyChange?.(false);
    try {
      const value = await getInterviewPlan({ ...normalizedSelection, signal: controller.signal });
      if (request === requestRef.current && !controller.signal.aborted) { setPlan(value); onReadyChange?.(true); }
    } catch (caught) {
      if (request === requestRef.current && !controller.signal.aborted) setError(errorMessage(caught));
    } finally {
      if (request === requestRef.current && !controller.signal.aborted) setIsLoading(false);
    }
  }, [normalizedSelection, onReadyChange]);
  useEffect(() => {
    if (!normalizedSelection) return undefined;
    void Promise.resolve().then(load);
    return () => { requestRef.current += 1; controllerRef.current?.abort(); };
  }, [load, normalizedSelection, onReadyChange]);
  if (!normalizedSelection) return null;
  return <Card className="interview-plan-preview">
    <p className="eyebrow">Interview plan</p><h2>Planned coverage</h2>
    {isLoading ? <LoadingState label="Preparing interview plan…" /> : null}
    {!isLoading && error ? <div className="coach-recovery"><InlineAlert tone="error">{error}</InlineAlert><Button onClick={load}>Retry plan</Button></div> : null}
    {!isLoading && plan ? <div className="planner-content">
      <p><strong>Opening focus:</strong> {plan.openingFocus.label}</p>
      <ol aria-label="Intended interview stages" className="planner-stage-list">{plan.stages.map((stage) => <li key={stage.order}>{stage.focus.label} <span>{stage.type === "opening" ? "Opening focus" : "Answer-adaptive stage"}</span></li>)}</ol>
      {plan.rationale.kind === "targeted_evidence" ? <p className="planner-rationale">Targeted evidence: {plan.rationale.masteryLabel}, {plan.rationale.confidence}, {plan.rationale.evidenceCount} evidence point{plan.rationale.evidenceCount === 1 ? "" : "s"}.</p> : <p className="planner-rationale">Plan uses {plan.rationale.kind === "type_level" ? "selected type and level" : "saved preparation context"}.</p>}
      <p className="planner-notice">{plan.adaptiveNotice}</p>
    </div> : null}
  </Card>;
}

export default InterviewPlannerPreview;
