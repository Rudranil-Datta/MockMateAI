import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { getCoachTree } from "../../api/coachTreeApi.js";
import Button from "../common/Button.jsx";
import Card from "../common/Card.jsx";
import InlineAlert from "../common/InlineAlert.jsx";
import LoadingState from "../common/LoadingState.jsx";

function message(error) {
  if (error?.code === "COACH_CONTEXT_UNAVAILABLE") return "Selected context is unavailable. Choose another context and try again.";
  return error?.code === "COACH_MALFORMED_RESPONSE" ? error.message : "Coach tree could not be loaded. Please try again.";
}

function CoachTreePanel({ context }) {
  const [tree, setTree] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const controllerRef = useRef(null);
  const requestRef = useRef(0);
  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    const request = ++requestRef.current;
    controllerRef.current = controller;
    setError(""); setIsLoading(true);
    try {
      const value = await getCoachTree({ context: context.kind, projectId: context.kind === "project" ? context.id : undefined, signal: controller.signal, targetId: context.kind === "target" ? context.id : undefined });
      if (request === requestRef.current && !controller.signal.aborted) setTree(value);
    } catch (caught) {
      if (request === requestRef.current && !controller.signal.aborted) { setTree(null); setError(message(caught)); }
    } finally {
      if (request === requestRef.current && !controller.signal.aborted) setIsLoading(false);
    }
  }, [context]);
  useEffect(() => { void Promise.resolve().then(load); return () => { requestRef.current += 1; controllerRef.current?.abort(); }; }, [load]);
  const byId = new Map(tree?.nodes.map((node) => [node.id, node]) || []);
  const branches = tree?.nodes.filter((node) => node.kind === "branch") || [];
  return <Card className="dashboard-panel coach-tree-panel">
    <div className="dashboard-panel-heading"><div><p className="eyebrow">Knowledge tree</p><h2>Evidence connections</h2></div></div>
    {isLoading ? <LoadingState label="Loading Coach knowledge tree…" /> : null}
    {!isLoading && error ? <div className="coach-recovery"><InlineAlert tone="error">{error}</InlineAlert><Button onClick={load}>Retry tree</Button></div> : null}
    {!isLoading && tree ? <div className="coach-content">
      {tree.evidenceSyncStatus === "pending" ? <InlineAlert tone="info">Evidence is still syncing. Tree uses currently saved evidence.</InlineAlert> : null}
      {!branches.length ? <p className="coach-empty">No tree evidence yet. Complete practice to add safe skill evidence.</p> : <ol className="coach-tree-list" aria-label="Coach knowledge tree">
        {branches.map((branch) => <li key={branch.id}><strong>{branch.label}</strong><ol>{tree.edges.filter((edge) => edge.from === branch.id).map((edge) => byId.get(edge.to)).filter(Boolean).map((skill) => <li key={skill.id}><span>{skill.label}: {skill.confidence} · {skill.evidenceCount} evidence point{skill.evidenceCount === 1 ? "" : "s"}{skill.masteryLabel ? ` · ${skill.masteryLabel}` : " · No mastery score yet"}</span>{skill.replayTo ? <Link className="text-link" to={skill.replayTo}>Review replay</Link> : null}</li>)}</ol></li>)}
      </ol>}
      {tree.omittedSkillCount ? <p className="coach-empty">{tree.omittedSkillCount} lower-priority skill{tree.omittedSkillCount === 1 ? " is" : "s are"} omitted from this bounded view.</p> : null}
    </div> : null}
  </Card>;
}
export default CoachTreePanel;
