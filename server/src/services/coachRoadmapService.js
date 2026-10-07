import CandidateProject from "../models/CandidateProject.js";
import InterviewSession from "../models/InterviewSession.js";
import JobTarget from "../models/JobTarget.js";
import { AppError } from "../utils/AppError.js";
import { getOwnedResourceFilter } from "../utils/getOwnedResourceFilter.js";

const projectCoverageDefinitions = [
  ["architecture", "Architecture", "architecture"],
  ["technology-choices", "Technology choices", "technologies"],
  ["responsibilities", "Responsibilities", "responsibilities"],
  ["decisions", "Decisions", "decisions"],
  ["tradeoffs", "Trade-offs", "tradeoffs"],
  ["claimed-results", "Claimed results", "claims"],
];

const confidenceOrder = {
  no_evidence: 0,
  provisional: 1,
  emerging: 2,
  established: 3,
};

function unavailableContext() {
  return new AppError(
    "COACH_CONTEXT_UNAVAILABLE",
    "Selected preparation context is unavailable.",
    { status: 404 },
  );
}

function safeSkill({ profileSkill, skillKey, skillLabel }) {
  if (!profileSkill) {
    return {
      confidence: "no_evidence",
      evidenceCount: 0,
      masteryLabel: null,
      masteryScore: null,
      skillKey,
      skillLabel,
    };
  }
  return {
    confidence: profileSkill.confidence,
    evidenceCount: profileSkill.evidenceCount,
    masteryLabel: profileSkill.masteryLabel,
    masteryScore: profileSkill.masteryScore,
    skillKey,
    skillLabel,
  };
}

function byAttention(left, right) {
  return (
    left.evidenceCount - right.evidenceCount ||
    (left.masteryScore ?? -1) - (right.masteryScore ?? -1) ||
    confidenceOrder[left.confidence] - confidenceOrder[right.confidence] ||
    left.skillKey.localeCompare(right.skillKey)
  );
}

function action(type, label, description, to) {
  return { description, label, to, type };
}

function practiceLink(skill) {
  return `/practice?focusSkillKey=${encodeURIComponent(skill.skillKey)}`;
}

function hasWeakEvidence(skill) {
  return skill && skill.masteryScore !== null && skill.masteryScore < 70;
}

function actionSet({ context, replay, topSkill }) {
  const evidenceAction = hasWeakEvidence(topSkill)
    ? action(
        "targeted_practice",
        `Practise ${topSkill.skillLabel}`,
        "Collect another focused evidence point through practice.",
        practiceLink(topSkill),
      )
    : action(
        "collect_evidence",
        "Collect practice evidence",
        "Complete practice to build confidence-labelled evidence.",
        "/practice",
      );
  const shared = [
    action(
      "add_context",
      "Add Job Target",
      "Add a role context for Role Simulation practice.",
      "/targets",
    ),
    action(
      "confirm_project",
      "Confirm Project",
      "Confirm project facts for Project Defense practice.",
      "/projects",
    ),
  ];
  let actions;
  if (context.kind === "job_target") {
    actions = [
      action(
        "collect_evidence",
        "Start Role Simulation",
        "Practise against this saved Job Target context.",
        `/practice?type=${encodeURIComponent("Role Simulation")}&targetId=${encodeURIComponent(context.id)}`,
      ),
      evidenceAction,
      shared[1],
    ];
  } else if (context.kind === "candidate_project") {
    actions = [
      action(
        "collect_evidence",
        "Start Project Defense",
        "Choose this practice type, then select a confirmed project.",
        `/practice?type=${encodeURIComponent("Project Defense")}`,
      ),
      evidenceAction,
      shared[0],
    ];
  } else {
    actions = [evidenceAction, ...shared];
  }
  if (replay) {
    actions.push(
      action(
        "review_replay",
        "Review latest replay",
        "Review saved practice evidence before your next session.",
        `/practice/${encodeURIComponent(replay.id)}/results`,
      ),
    );
  }
  return actions;
}

function projectSkills(project, profileByKey) {
  return projectCoverageDefinitions
    .filter(([, , factKey]) => Array.isArray(project[factKey]) && project[factKey].length)
    .map(([skillKey, skillLabel], index) => ({
      ...safeSkill({
        profileSkill: profileByKey.get(skillKey),
        skillKey,
        skillLabel,
      }),
      index,
    }))
    .sort((left, right) => {
      const leftNeedsAttention =
        left.confidence !== "established" || left.masteryScore === null || left.masteryScore < 70;
      const rightNeedsAttention =
        right.confidence !== "established" || right.masteryScore === null || right.masteryScore < 70;
      return (
        Number(rightNeedsAttention) - Number(leftNeedsAttention) ||
        byAttention(left, right) ||
        left.index - right.index
      );
    })
    .map(({ index: _index, ...skill }) => skill)
    .slice(0, 12);
}

function targetSkills(target, profileByKey) {
  return target.analysis.skills
    .map((skill, index) => ({
      ...safeSkill({
        profileSkill: profileByKey.get(skill.key),
        skillKey: skill.key,
        skillLabel: skill.label,
      }),
      index,
      weight: skill.weight,
    }))
    .sort(
      (left, right) =>
        right.weight - left.weight || byAttention(left, right) || left.index - right.index,
    )
    .map(({ index: _index, weight: _weight, ...skill }) => skill)
    .slice(0, 12);
}

export function createCoachRoadmapService({
  candidateProjectModel = CandidateProject,
  interviewSessionModel = InterviewSession,
  jobTargetModel = JobTarget,
  skillEvidenceService,
} = {}) {
  if (!skillEvidenceService?.getReadOnlyProfile) {
    throw new TypeError("Coach roadmap requires a read-only skill profile.");
  }

  async function latestReplay({ context, userId }) {
    const filter = { status: "completed", userId };
    if (context.kind === "job_target") filter.jobTargetId = context.id;
    if (context.kind === "candidate_project") filter.projectId = context.id;
    const replay = await interviewSessionModel
      .findOne(filter)
      .sort({ completedAt: -1, _id: -1 })
      .select({ _id: 1 })
      .lean();
    return replay ? { id: replay._id.toString() } : null;
  }

  return {
    async getRoadmap({ context, projectId, targetId, userId }) {
      const profile = await skillEvidenceService.getReadOnlyProfile({ userId });
      const profileByKey = new Map(
        profile.skills.map((skill) => [skill.skillKey, skill]),
      );
      let selectedContext;
      let skills;

      if (context === "target") {
        const target = await jobTargetModel
          .findOne({ ...getOwnedResourceFilter(targetId, userId), status: "ready" })
          .select({ analysis: 1, company: 1, title: 1 })
          .lean();
        if (!target?.analysis?.skills?.length) throw unavailableContext();
        selectedContext = {
          id: target._id.toString(),
          kind: "job_target",
          label: target.company ? `${target.title} at ${target.company}` : target.title,
        };
        skills = targetSkills(target, profileByKey);
      } else if (context === "project") {
        const project = await candidateProjectModel
          .findOne({ ...getOwnedResourceFilter(projectId, userId), confirmedAt: { $ne: null } })
          .select({
            architecture: 1,
            claims: 1,
            decisions: 1,
            name: 1,
            responsibilities: 1,
            role: 1,
            technologies: 1,
            tradeoffs: 1,
          })
          .lean();
        if (!project) throw unavailableContext();
        selectedContext = {
          id: project._id.toString(),
          kind: "candidate_project",
          label: `${project.name} — ${project.role}`,
        };
        skills = projectSkills(project, profileByKey);
      } else {
        selectedContext = { kind: "overall", label: "Overall preparation" };
        skills = profile.skills.slice(0, 12).map((skill) => safeSkill({
          profileSkill: skill,
          skillKey: skill.skillKey,
          skillLabel: skill.skillLabel,
        }));
      }

      const topSkill =
        context === "overall" && profile.recommendedAction
          ? skills.find((skill) => skill.skillKey === profile.recommendedAction.skillKey) || skills[0]
          : skills[0];
      const replay = await latestReplay({ context: selectedContext, userId });
      return {
        actions: actionSet({ context: selectedContext, replay, topSkill }),
        context: {
          kind: selectedContext.kind,
          label: selectedContext.label,
        },
        evidenceSyncStatus: profile.evidenceSyncStatus,
        skills,
      };
    },
  };
}
