import { useState } from "react";

import CoachPanel from "./CoachPanel.jsx";
import CoachPlannerPanel from "./CoachPlannerPanel.jsx";
import CoachTreePanel from "./CoachTreePanel.jsx";

function CoachWorkspace({ projects, targets }) {
  const [context, setContext] = useState({ kind: "overall" });
  return <div className="coach-workspace">
    <CoachPanel context={context} onContextChange={setContext} projects={projects} targets={targets} />
    <CoachPlannerPanel context={context} />
    <CoachTreePanel context={context} />
  </div>;
}

export default CoachWorkspace;
