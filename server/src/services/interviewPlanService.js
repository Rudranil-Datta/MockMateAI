import { AppError } from "../utils/AppError.js";
import {
  projectCoveragePlan,
  roleCoveragePlan,
} from "./interviewCoverageService.js";

const adaptiveNotice =
  "Later questions adapt to your answers and are not prewritten.";

const genericPlans = {
  DSA: [
    "Problem and baseline approach",
    "Reasoning and trade-offs",
    "Core concept coverage",
  ],
  HR: [
    "Relevant experience",
    "Decision and outcome reasoning",
    "Reflection and remaining evidence",
  ],
  "System Design": [
    "System framing and constraints",
    "Design reasoning and trade-offs",
    "Failure and coverage review",
  ],
};

function skillNotFound() {
  return new AppError("SKILL_NOT_FOUND", "Skill not found.", { status: 404 });
}

function stages(coverage) {
  return coverage.slice(0, 5).map((item, index) => ({
    focus: { label: item.label, topicKey: item.topicKey },
    order: index + 1,
    type: index === 0 ? "opening" : "planned_coverage",
  }));
}

function genericStages(interviewType) {
  return genericPlans[interviewType].map((label, index) => ({
    focus: {
      label,
      topicKey: `${interviewType.toLowerCase().replaceAll(" ", "-")}-${index + 1}`,
    },
    order: index + 1,
    type: index === 0 ? "opening" : "adaptive_follow_up",
  }));
}

export function createInterviewPlanService({
  jobTargetService,
  projectService,
  resumeService,
  skillEvidenceService,
} = {}) {
  if (
    !jobTargetService?.getReadyTargetSnapshot ||
    !projectService?.getConfirmedProjectSnapshot ||
    !resumeService?.assertOwnedCompletedResume ||
    !skillEvidenceService?.getReadOnlyProfile
  ) {
    throw new TypeError(
      "Interview planner requires read-only owned-resource services.",
    );
  }

  return {
    async getPlan({
      focusSkillKey,
      interviewType,
      jobTargetId,
      level,
      projectId,
      resumeId,
      sessionPurpose,
      userId,
    }) {
      const [context, profile] = await Promise.all([
        interviewType === "Role Simulation"
          ? jobTargetService.getReadyTargetSnapshot({
              targetId: jobTargetId,
              userId,
            })
          : interviewType === "Project Defense"
            ? projectService.getConfirmedProjectSnapshot({ projectId, userId })
            : null,
        sessionPurpose === "targeted_practice"
          ? skillEvidenceService.getReadOnlyProfile({ userId })
          : null,
        resumeId
          ? resumeService.assertOwnedCompletedResume({ resumeId, userId })
          : null,
      ]);
      const focusSkill =
        sessionPurpose === "targeted_practice"
          ? profile.skills.find(
              (skill) =>
                skill.skillKey === focusSkillKey && skill.masteryScore < 70,
            )
          : null;
      if (sessionPurpose === "targeted_practice" && !focusSkill)
        throw skillNotFound();

      const coverage =
        sessionPurpose === "targeted_practice"
          ? [{ label: focusSkill.skillLabel, topicKey: focusSkill.skillKey }]
          : interviewType === "Role Simulation"
            ? roleCoveragePlan(context)
            : interviewType === "Project Defense"
              ? projectCoveragePlan(context)
              : null;
      const planStages = coverage
        ? stages(coverage)
        : genericStages(interviewType);
      const openingFocus = planStages[0].focus;
      const rationale =
        sessionPurpose === "targeted_practice"
          ? {
              confidence: focusSkill.confidence,
              evidenceCount: focusSkill.evidenceCount,
              kind: "targeted_evidence",
              masteryLabel: focusSkill.masteryLabel,
            }
          : context
            ? {
                kind:
                  context.kind === "job_target"
                    ? "target_coverage"
                    : "project_coverage",
              }
            : { kind: "type_level" };

      return {
        adaptiveNotice,
        context: context
          ? { kind: context.kind, label: context.displayLabel }
          : null,
        openingFocus,
        rationale,
        selection: {
          interviewType,
          level,
          ...(focusSkill ? { focusSkillKey: focusSkill.skillKey } : {}),
          sessionPurpose,
        },
        stages: planStages,
      };
    },
  };
}
