import { useEffect, useMemo, useState } from "react";
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
  const params = new URLSearchParams({ level: selection.level, type: selection.interviewType });
  if (selection.jobTargetId) params.set("targetId", selection.jobTargetId);
  if (selection.projectId) params.set("projectId", selection.projectId);
  if (selection.focusSkillKey) params.set("focusSkillKey", selection.focusSkillKey);
  return `/practice?${params.toString()}`;
}

function CoachPlannerPanelContent({ context }) {
  const [level, setLevel] = useState("intermediate");
  const [type, setType] = useState(() => contextType(context));
  const [focusSkillKey, setFocusSkillKey] = useState("");
  const [skills, setSkills] = useState([]);
  const [isPlanReady, setIsPlanReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    getSkillProfile({ signal: controller.signal }).then((profile) => {
      if (!controller.signal.aborted) setSkills(profile.skills.filter((skill) => skill.masteryScore < 70));
    }).catch(() => { if (!controller.signal.aborted) setSkills([]); });
    return () => controller.abort();
  }, []);
  const interviewType = context.kind === "overall" ? type : contextType(context);
  const selection = useMemo(() => ({
    interviewType,
    ...(context.kind === "target" ? { jobTargetId: context.id } : {}),
    level,
    ...(context.kind === "project" ? { projectId: context.id } : {}),
    ...(focusSkillKey ? { focusSkillKey, sessionPurpose: "targeted_practice" } : {}),
  }), [context, focusSkillKey, interviewType, level]);
  return <Card className="dashboard-panel coach-planner-panel">
    <p className="eyebrow">Interview planner</p><h2>Preview before practice</h2>
    <div className="coach-planner-controls">
      {context.kind === "overall" ? <label>Interview type<select onChange={(event) => { setType(event.target.value); setIsPlanReady(false); }} value={type}>{genericTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label> : <p>Type: {interviewType}</p>}
      <label>Level<select onChange={(event) => { setLevel(event.target.value); setIsPlanReady(false); }} value={level}>{["beginner", "intermediate", "advanced"].map((item) => <option key={item} value={item}>{`${item.charAt(0).toUpperCase()}${item.slice(1)}`}</option>)}</select></label>
      {skills.length ? <label>Focus skill<select onChange={(event) => { setFocusSkillKey(event.target.value); setIsPlanReady(false); }} value={focusSkillKey}><option value="">No focused skill</option>{skills.map((skill) => <option key={skill.skillKey} value={skill.skillKey}>{skill.skillLabel}</option>)}</select></label> : null}
    </div>
    <InterviewPlannerPreview onReadyChange={setIsPlanReady} selection={selection} />
    {isPlanReady ? <Link className="text-link" to={practiceLink(selection)}>Adjust setup and start practice</Link> : null}
  </Card>;
}

function CoachPlannerPanel({ context }) {
  return <CoachPlannerPanelContent context={context} key={`${context.kind}:${context.id || "overall"}`} />;
}

export default CoachPlannerPanel;
