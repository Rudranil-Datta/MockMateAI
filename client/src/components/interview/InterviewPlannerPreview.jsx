import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getInterviewPlan } from "../../api/interviewPlanApi.js";
import Button from "../common/Button.jsx";
import Card from "../common/Card.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import LoadingState from "../common/LoadingState.jsx";

function errorMessage(error) {
  if (error?.code === "INTERVIEW_PLAN_MALFORMED_RESPONSE") return error.message;
  if (
    [
      "JOB_TARGET_NOT_FOUND",
      "PROJECT_NOT_FOUND",
      "RESUME_CONTEXT_UNAVAILABLE",
      "SKILL_NOT_FOUND",
    ].includes(error?.code)
  )
    return "Selected planning context is unavailable. Adjust your choices and try again.";
  return "Interview plan could not be loaded. Your choices are still here.";
}

function levelExpectation(level) {
  if (level === "beginner")
    return "Explain core concepts and one clear example.";
  if (level === "advanced")
    return "Compare constraints, trade-offs, and alternatives.";
  return "Explain an approach, one trade-off, and one concrete example.";
}

function InterviewPlannerPreview({
  onReadyChange,
  onRefresh,
  onRefreshOutcome,
  refreshCycle,
  refreshVersion = 0,
  selection,
}) {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(selection));
  const controllerRef = useRef(null);
  const requestRef = useRef(0);
  const refreshCycleRef = useRef(null);
  const refreshEpoch = refreshCycle?.epoch;
  useEffect(() => {
    refreshCycleRef.current = refreshCycle;
  }, [refreshCycle]);
  const selectionKey = JSON.stringify(selection || {});
  const normalizedSelection = useMemo(
    () => (selectionKey === "{}" ? null : JSON.parse(selectionKey)),
    [selectionKey],
  );
  const load = useCallback(
    async (cycle) => {
      if (!normalizedSelection) return;
      controllerRef.current?.abort();
      const controller = new AbortController();
      const request = ++requestRef.current;
      controllerRef.current = controller;
      setError("");
      setIsLoading(true);
      onReadyChange?.(false);
      try {
        const value = await getInterviewPlan({
          ...normalizedSelection,
          signal: controller.signal,
        });
        if (request === requestRef.current && !controller.signal.aborted) {
          setPlan(value);
          onReadyChange?.(true);
          if (cycle) {
            onRefreshOutcome?.({
              cycle,
              evidenceSyncStatus: "ready",
              kind: "success",
              signature: JSON.stringify(value),
            });
          }
        }
      } catch (caught) {
        if (request === requestRef.current && !controller.signal.aborted) {
          setError(errorMessage(caught));
          if (cycle) onRefreshOutcome?.({ cycle, kind: "error" });
        }
      } finally {
        if (request === requestRef.current && !controller.signal.aborted)
          setIsLoading(false);
      }
    },
    [normalizedSelection, onReadyChange, onRefreshOutcome],
  );
  useEffect(() => {
    if (!normalizedSelection) return undefined;
    const cycle = refreshCycleRef.current?.isRefreshing
      ? refreshCycleRef.current
      : undefined;
    void Promise.resolve().then(() => load(cycle));
    return () => {
      requestRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [load, normalizedSelection, onReadyChange, refreshEpoch, refreshVersion]);
  if (!normalizedSelection) return null;
  return (
    <Card className="interview-plan-preview">
      <p className="eyebrow">Your practice plan</p>
      <h2>What this session will cover</h2>
      {isLoading && !plan ? (
        <LoadingState label="Preparing interview plan…" />
      ) : null}
      {isLoading && plan ? <p role="status">Updating interview plan…</p> : null}
      {!isLoading && error ? (
        <div className="coach-recovery">
          <InlineAlert tone="error">{error}</InlineAlert>
          <Button onClick={onRefresh || load}>Retry plan</Button>
        </div>
      ) : null}
      {plan ? (
        <div className="planner-content">
          <p>
            <strong>Opening focus:</strong> {plan.openingFocus.label}
          </p>
          <p className="planner-rationale">
            <strong>{plan.selection.level} expectation:</strong>{" "}
            {levelExpectation(plan.selection.level)}
          </p>
          <ol
            aria-label="Intended interview stages"
            className="planner-stage-list"
          >
            {plan.stages.map((stage) => (
              <li key={stage.order}>
                {stage.focus.label}{" "}
                <span>
                  {stage.type === "opening"
                    ? "Opening focus"
                    : "Answer-adaptive stage"}
                </span>
                <span className="planner-stage-help">
                  {stage.order === 1
                    ? "Establishes current evidence for this level."
                    : stage.order === 2
                      ? "Answers can deepen, clarify, or recover this coverage."
                      : "Checks remaining coverage without repeating a prompt."}
                </span>
              </li>
            ))}
          </ol>
          {plan.rationale.kind === "targeted_evidence" ? (
            <p className="planner-rationale">
              Targeted evidence: {plan.rationale.masteryLabel},{" "}
              {plan.rationale.confidence}, {plan.rationale.evidenceCount}{" "}
              evidence point{plan.rationale.evidenceCount === 1 ? "" : "s"}.
            </p>
          ) : (
            <p className="planner-rationale">
              This plan uses{" "}
              {plan.rationale.kind === "type_level"
                ? "selected type and level"
                : "saved preparation context"}
              .
            </p>
          )}
          <p className="planner-notice">{plan.adaptiveNotice}</p>
          <p className="planner-notice">
            Your answers can shape later questions: they may go deeper, clarify
            an area, revisit it, or move to another topic.
          </p>
          <p className="planner-notice">
            Sessions have at most five questions. This preview shows focus
            areas, not final questions.
          </p>
        </div>
      ) : null}
    </Card>
  );
}

export default InterviewPlannerPreview;
