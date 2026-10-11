import { useCallback, useRef, useState } from "react";

import CoachPanel from "./CoachPanel.jsx";
import CoachPlannerPanel from "./CoachPlannerPanel.jsx";
import CoachTreePanel from "./CoachTreePanel.jsx";

function CoachWorkspace({ projects, targets }) {
  const [context, setContext] = useState({ kind: "overall" });
  const [refreshVersion] = useState(0);
  const [refreshCycle, setRefreshCycle] = useState(null);
  const signaturesRef = useRef(new Map());
  const epochRef = useRef(0);
  const activeCycleRef = useRef(null);
  const contextKey = `${context.kind}:${context.id || "overall"}`;

  const refreshCoach = useCallback(() => {
    setRefreshCycle((current) => {
      if (current?.isRefreshing) return current;
      const epoch = epochRef.current + 1;
      epochRef.current = epoch;
      const next = {
        contextKey,
        epoch,
        isRefreshing: true,
        outcomes: {},
        status: "Updating Coach…",
      };
      activeCycleRef.current = next;
      return next;
    });
  }, [contextKey]);

  const changeContext = useCallback((nextContext) => {
    epochRef.current += 1;
    activeCycleRef.current = null;
    setRefreshCycle(null);
    setContext(nextContext);
  }, []);

  const reportRefreshOutcome = useCallback((outcome) => {
    const activeCycle = activeCycleRef.current;
    if (
      !activeCycle?.isRefreshing ||
      activeCycle.epoch !== outcome.epoch ||
      activeCycle.contextKey !== outcome.contextKey
    )
      return;
    const signatureKey = `${outcome.contextKey}:${outcome.surface}`;
    const completedOutcome =
      outcome.kind === "success"
        ? {
            ...outcome,
            isUnchanged:
              signaturesRef.current.get(signatureKey) === outcome.signature,
          }
        : outcome;
    if (completedOutcome.kind === "success")
      signaturesRef.current.set(signatureKey, completedOutcome.signature);
    setRefreshCycle((current) => {
      if (
        !current?.isRefreshing ||
        current.epoch !== completedOutcome.epoch ||
        current.contextKey !== completedOutcome.contextKey
      )
        return current;
      const outcomes = {
        ...current.outcomes,
        [completedOutcome.surface]: completedOutcome,
      };
      if (!["roadmap", "tree", "planner"].every((surface) => outcomes[surface]))
        return { ...current, outcomes };
      const completed = Object.values(outcomes);
      let status;
      if (completed.some((item) => item.kind === "error")) {
        status =
          "Coach refresh incomplete. Showing last loaded view. Retry Coach.";
      } else if (
        completed.some((item) => item.evidenceSyncStatus === "pending")
      ) {
        status = "Evidence still syncing. Coach uses currently saved evidence.";
      } else {
        const unchanged = completed.every((item) => item.isUnchanged);
        status = unchanged
          ? "No new evidence."
          : "Updated Coach view using current saved evidence.";
      }
      return { ...current, isRefreshing: false, outcomes, status };
    });
  }, []);
  return (
    <div className="coach-workspace">
      <CoachPanel
        context={context}
        isRefreshing={refreshCycle?.isRefreshing || false}
        onContextChange={changeContext}
        onRefresh={refreshCoach}
        onRefreshOutcome={reportRefreshOutcome}
        projects={projects}
        refreshCycle={refreshCycle}
        refreshVersion={refreshVersion}
        refreshStatus={refreshCycle?.status || ""}
        targets={targets}
      />
      <CoachPlannerPanel
        context={context}
        onRefresh={refreshCoach}
        onRefreshOutcome={reportRefreshOutcome}
        refreshCycle={refreshCycle}
        refreshVersion={refreshVersion}
      />
      <CoachTreePanel
        context={context}
        onRefresh={refreshCoach}
        onRefreshOutcome={reportRefreshOutcome}
        refreshCycle={refreshCycle}
        refreshVersion={refreshVersion}
      />
    </div>
  );
}

export default CoachWorkspace;
