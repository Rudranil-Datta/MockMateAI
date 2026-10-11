import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { getSkillProfile } from "../../api/skillApi.js";
import InterviewPlannerPreview from "../interview/InterviewPlannerPreview.jsx";
import Card from "../common/Card.jsx";

const genericTypes = ["DSA", "HR", "System Design"];

function contextType(context) {
  if (context.kind === "target") return "Role Simulation";
  if (context.kind === "project") return "Project Defense";
  return "DSA";
}

function practiceLink(selection) {
  const params = new URLSearchParams({
    level: selection.level,
    type: selection.interviewType,
  });
  if (selection.jobTargetId) params.set("targetId", selection.jobTargetId);
  if (selection.projectId) params.set("projectId", selection.projectId);
  if (selection.focusSkillKey)
    params.set("focusSkillKey", selection.focusSkillKey);
  return `/practice?${params.toString()}`;
}

function CoachPlannerPanelContent({
  context,
  onRefresh,
  onRefreshOutcome,
  refreshCycle,
  refreshVersion,
}) {
  const [level, setLevel] = useState("intermediate");
  const [type, setType] = useState(() => contextType(context));
  const [focusSkillKey, setFocusSkillKey] = useState("");
  const [skills, setSkills] = useState([]);
  const [isPlanReady, setIsPlanReady] = useState(false);
  const refreshPartsRef = useRef(new Map());
  const refreshCycleRef = useRef(null);
  const refreshEpoch = refreshCycle?.epoch;
  useEffect(() => {
    refreshCycleRef.current = refreshCycle;
  }, [refreshCycle]);
  const reportPlannerPart = useCallback(
    (part, outcome) => {
      const cycle = outcome.cycle;
      if (!cycle) return;
      const parts = {
        ...(refreshPartsRef.current.get(cycle.epoch) || {}),
        [part]: outcome,
      };
      refreshPartsRef.current.set(cycle.epoch, parts);
      if (!parts.plan || !parts.profile) return;
      const values = [parts.plan, parts.profile];
      onRefreshOutcome?.({
        contextKey: cycle.contextKey,
        epoch: cycle.epoch,
        evidenceSyncStatus: values.some(
          (item) => item.evidenceSyncStatus === "pending",
        )
          ? "pending"
          : "ready",
        kind: values.some((item) => item.kind === "error")
          ? "error"
          : "success",
        signature: JSON.stringify(values.map((item) => item.signature || "")),
        surface: "planner",
      });
    },
    [onRefreshOutcome],
  );
  const reportPlanOutcome = useCallback(
    (outcome) => reportPlannerPart("plan", outcome),
    [reportPlannerPart],
  );
  useEffect(() => {
    const cycle = refreshCycleRef.current?.isRefreshing
      ? refreshCycleRef.current
      : undefined;
    const controller = new AbortController();
    getSkillProfile({ signal: controller.signal })
      .then((profile) => {
        if (!controller.signal.aborted) {
          const nextSkills = profile.skills.filter(
            (skill) => skill.masteryScore < 70,
          );
          setSkills(nextSkills);
          reportPlannerPart("profile", {
            cycle,
            evidenceSyncStatus: "ready",
            kind: "success",
            signature: JSON.stringify(nextSkills),
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSkills([]);
          reportPlannerPart("profile", {
            cycle,
            evidenceSyncStatus: "ready",
            kind: "success",
            signature: "[]",
          });
        }
      });
    return () => controller.abort();
  }, [refreshEpoch, refreshVersion, reportPlannerPart]);
  const interviewType =
    context.kind === "overall" ? type : contextType(context);
  const selection = useMemo(
    () => ({
      interviewType,
      ...(context.kind === "target" ? { jobTargetId: context.id } : {}),
      level,
      ...(context.kind === "project" ? { projectId: context.id } : {}),
      ...(focusSkillKey
        ? { focusSkillKey, sessionPurpose: "targeted_practice" }
        : {}),
    }),
    [context, focusSkillKey, interviewType, level],
  );
  return (
    <Card className="dashboard-panel coach-planner-panel">
      <p className="eyebrow">Plan your practice</p>
      <h2>See your session focus</h2>
      <div className="coach-planner-controls">
        {context.kind === "overall" ? (
          <label>
            Interview type
            <select
              onChange={(event) => {
                setType(event.target.value);
                setIsPlanReady(false);
              }}
              value={type}
            >
              {genericTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p>Type: {interviewType}</p>
        )}
        <label>
          Level
          <select
            onChange={(event) => {
              setLevel(event.target.value);
              setIsPlanReady(false);
            }}
            value={level}
          >
            {["beginner", "intermediate", "advanced"].map((item) => (
              <option
                key={item}
                value={item}
              >{`${item.charAt(0).toUpperCase()}${item.slice(1)}`}</option>
            ))}
          </select>
        </label>
        {skills.length ? (
          <label>
            Focus skill
            <select
              onChange={(event) => {
                setFocusSkillKey(event.target.value);
                setIsPlanReady(false);
              }}
              value={focusSkillKey}
            >
              <option value="">No focused skill</option>
              {skills.map((skill) => (
                <option key={skill.skillKey} value={skill.skillKey}>
                  {skill.skillLabel}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <InterviewPlannerPreview
        onReadyChange={setIsPlanReady}
        onRefresh={onRefresh}
        onRefreshOutcome={reportPlanOutcome}
        refreshCycle={refreshCycle}
        refreshVersion={refreshVersion}
        selection={selection}
      />
      {isPlanReady ? (
        <Link className="text-link" to={practiceLink(selection)}>
          Adjust your choices and start practice
        </Link>
      ) : null}
    </Card>
  );
}

function CoachPlannerPanel({
  context,
  onRefresh,
  onRefreshOutcome,
  refreshCycle,
  refreshVersion = 0,
}) {
  return (
    <CoachPlannerPanelContent
      context={context}
      key={`${context.kind}:${context.id || "overall"}`}
      onRefresh={onRefresh}
      onRefreshOutcome={onRefreshOutcome}
      refreshCycle={refreshCycle}
      refreshVersion={refreshVersion}
    />
  );
}

export default CoachPlannerPanel;
