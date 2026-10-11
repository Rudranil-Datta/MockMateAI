import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { getCoachTree } from "../../api/coachTreeApi.js";
import Button from "../common/Button.jsx";
import Card from "../common/Card.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import LoadingState from "../common/LoadingState.jsx";

function message(error) {
  if (error?.code === "COACH_CONTEXT_UNAVAILABLE")
    return "Selected context is unavailable. Choose another context and try again.";
  return error?.code === "COACH_MALFORMED_RESPONSE"
    ? error.message
    : "Coach tree could not be loaded. Please try again.";
}

function CoachTreePanel({
  context,
  onRefresh,
  onRefreshOutcome,
  refreshCycle,
  refreshVersion = 0,
}) {
  const [tree, setTree] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const controllerRef = useRef(null);
  const requestRef = useRef(0);
  const refreshCycleRef = useRef(null);
  const refreshEpoch = refreshCycle?.epoch;
  useEffect(() => {
    refreshCycleRef.current = refreshCycle;
  }, [refreshCycle]);
  const load = useCallback(
    async (cycle) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      const request = ++requestRef.current;
      controllerRef.current = controller;
      setError("");
      setIsLoading(true);
      try {
        const value = await getCoachTree({
          context: context.kind,
          projectId: context.kind === "project" ? context.id : undefined,
          signal: controller.signal,
          targetId: context.kind === "target" ? context.id : undefined,
        });
        if (request === requestRef.current && !controller.signal.aborted) {
          setTree(value);
          if (cycle) {
            onRefreshOutcome?.({
              contextKey: cycle.contextKey,
              epoch: cycle.epoch,
              evidenceSyncStatus: value.evidenceSyncStatus,
              kind: "success",
              signature: JSON.stringify(value),
              surface: "tree",
            });
          }
        }
      } catch (caught) {
        if (request === requestRef.current && !controller.signal.aborted) {
          setError(message(caught));
          if (cycle) {
            onRefreshOutcome?.({
              contextKey: cycle.contextKey,
              epoch: cycle.epoch,
              kind: "error",
              surface: "tree",
            });
          }
        }
      } finally {
        if (request === requestRef.current && !controller.signal.aborted)
          setIsLoading(false);
      }
    },
    [context, onRefreshOutcome],
  );
  useEffect(() => {
    const cycle = refreshCycleRef.current?.isRefreshing
      ? refreshCycleRef.current
      : undefined;
    void Promise.resolve().then(() => load(cycle));
    return () => {
      requestRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [load, refreshEpoch, refreshVersion]);
  const byId = new Map(tree?.nodes.map((node) => [node.id, node]) || []);
  const branches = tree?.nodes.filter((node) => node.kind === "branch") || [];
  return (
    <Card className="dashboard-panel coach-tree-panel">
      <div className="dashboard-panel-heading">
        <div>
          <p className="eyebrow">Your skill connections</p>
          <h2>What your practice shows</h2>
        </div>
      </div>
      {isLoading && !tree ? (
        <LoadingState label="Loading Coach knowledge tree…" />
      ) : null}
      {isLoading && tree ? <p role="status">Updating knowledge tree…</p> : null}
      {!isLoading && error ? (
        <div className="coach-recovery">
          <InlineAlert tone="error">{error}</InlineAlert>
          <Button onClick={onRefresh || load}>Retry tree</Button>
        </div>
      ) : null}
      {tree ? (
        <div className="coach-content">
          <p className="coach-context-name">
            Selected context: {tree.context.label}
          </p>
          {tree.evidenceSyncStatus === "pending" ? (
            <InlineAlert tone="info">
              Evidence is still syncing. Tree uses currently saved evidence.
            </InlineAlert>
          ) : null}
          {!branches.length ? (
            <p className="coach-empty">
              No saved skill evidence yet. Complete a practice session to start
              building this view.
            </p>
          ) : (
            <ol className="coach-tree-list" aria-label="Coach knowledge tree">
              {branches.map((branch) => (
                <li key={branch.id}>
                  <strong>{branch.label}</strong>
                  <ol>
                    {tree.edges
                      .filter((edge) => edge.from === branch.id)
                      .map((edge) => byId.get(edge.to))
                      .filter(Boolean)
                      .map((skill) => (
                        <li key={skill.id}>
                          <span className="coach-tree-help">
                            This skill is grouped with {branch.label} for your
                            selected context.
                          </span>
                          <span>
                            {skill.label}: {skill.confidence} ·{" "}
                            {skill.evidenceCount} evidence point
                            {skill.evidenceCount === 1 ? "" : "s"}
                            {skill.masteryLabel
                              ? ` · ${skill.masteryLabel}`
                              : " · No mastery score yet"}
                          </span>
                          <span className="coach-tree-help">
                            Saved answers provide this evidence. Mastery
                            reflects answer quality; confidence reflects amount
                            and recency.
                          </span>
                          <Link
                            className="text-link"
                            to={`/practice?focusSkillKey=${encodeURIComponent(skill.skillKey)}`}
                          >
                            Practise this skill next
                          </Link>
                          {skill.replayTo ? (
                            <Link className="text-link" to={skill.replayTo}>
                              Review replay
                            </Link>
                          ) : null}
                        </li>
                      ))}
                  </ol>
                </li>
              ))}
            </ol>
          )}
          {tree.omittedSkillCount ? (
            <p className="coach-empty">
              {tree.omittedSkillCount} lower-priority skill
              {tree.omittedSkillCount === 1 ? " is" : "s are"} omitted from this
              bounded view.
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
export default CoachTreePanel;
