import CandidateProject from "../models/CandidateProject.js";
import InterviewSession from "../models/InterviewSession.js";
import JobTarget from "../models/JobTarget.js";
import { AppError } from "../utils/AppError.js";
import { getOwnedResourceFilter } from "../utils/getOwnedResourceFilter.js";

const projectCoverage = [
  ["architecture", "Architecture", "architecture"],
  ["technology-choices", "Technology choices", "technologies"],
  ["responsibilities", "Responsibilities", "responsibilities"],
  ["decisions", "Decisions", "decisions"],
  ["tradeoffs", "Trade-offs", "tradeoffs"],
  ["claimed-results", "Claimed results", "claims"],
];
const confidenceOrder = { no_evidence: 0, provisional: 1, emerging: 2, established: 3 };

function unavailable() {
  return new AppError("COACH_CONTEXT_UNAVAILABLE", "Selected preparation context is unavailable.", { status: 404 });
}

function safeSkill(source, key, label) {
  return source
    ? { confidence: source.confidence, evidenceCount: source.evidenceCount, masteryLabel: source.masteryLabel, masteryScore: source.masteryScore, skillKey: key, skillLabel: label }
    : { confidence: "no_evidence", evidenceCount: 0, masteryLabel: null, masteryScore: null, skillKey: key, skillLabel: label };
}

function attention(left, right) {
  return left.evidenceCount - right.evidenceCount || (left.masteryScore ?? -1) - (right.masteryScore ?? -1) || confidenceOrder[left.confidence] - confidenceOrder[right.confidence] || left.skillKey.localeCompare(right.skillKey);
}

export function createCoachKnowledgeTreeService({
  candidateProjectModel = CandidateProject,
  interviewSessionModel = InterviewSession,
  jobTargetModel = JobTarget,
  skillEvidenceService,
} = {}) {
  if (!skillEvidenceService?.getReadOnlyProfile) throw new TypeError("Coach tree requires a read-only skill profile.");

  async function replayFor(skillKey, userId) {
    const session = await interviewSessionModel.findOne({
      "questions.testedSkillKeys": skillKey,
      status: "completed",
      userId,
    }).sort({ completedAt: -1, _id: -1 }).select({ _id: 1 }).lean();
    return session ? `/practice/${session._id.toString()}/results` : null;
  }

  return {
    async getTree({ context, projectId, targetId, userId }) {
      const profile = await skillEvidenceService.getReadOnlyProfile({ userId });
      const byKey = new Map(profile.skills.map((skill) => [skill.skillKey, skill]));
      let selected;
      let branches;
      if (context === "target") {
        const target = await jobTargetModel.findOne({ ...getOwnedResourceFilter(targetId, userId), status: "ready" }).select({ analysis: 1, company: 1, title: 1 }).lean();
        if (!target?.analysis?.skills?.length) throw unavailable();
        selected = { kind: "job_target", label: target.company ? `${target.title} at ${target.company}` : target.title };
        branches = target.analysis.requirements.map((requirement, index) => ({
          key: requirement.key,
          label: requirement.label,
          order: index,
          skills: target.analysis.skills.filter((skill) => skill.sourceRequirementKeys.includes(requirement.key)).map((skill) => safeSkill(byKey.get(skill.key), skill.key, skill.label)).sort(attention),
        }));
      } else if (context === "project") {
        const project = await candidateProjectModel.findOne({ ...getOwnedResourceFilter(projectId, userId), confirmedAt: { $ne: null } }).select({ architecture: 1, claims: 1, decisions: 1, name: 1, responsibilities: 1, role: 1, technologies: 1, tradeoffs: 1 }).lean();
        if (!project) throw unavailable();
        selected = { kind: "candidate_project", label: `${project.name} — ${project.role}` };
        branches = projectCoverage.filter(([, , field]) => Array.isArray(project[field]) && project[field].length).map(([key, label], index) => ({ key, label, order: index, skills: [safeSkill(byKey.get(key), key, label)] }));
      } else {
        selected = { kind: "overall", label: "Overall preparation" };
        branches = [{ key: "overall-evidence", label: "Overall skill evidence", order: 0, skills: profile.skills.map((skill) => safeSkill(skill, skill.skillKey, skill.skillLabel)).sort(attention) }];
      }
      const cappedBranches = branches.slice(0, 12);
      const allSkills = cappedBranches.flatMap((branch) => branch.skills);
      const keptKeys = new Set(allSkills.sort(attention).slice(0, 12).map((skill) => skill.skillKey));
      const nodes = [{ id: "context", kind: "context", label: selected.label }];
      const edges = [];
      const nodeIds = new Set(["context"]);
      const linkedSkillKeys = new Set();
      for (const branch of cappedBranches) {
        const skills = branch.skills.filter((skill) => {
          if (!keptKeys.has(skill.skillKey) || linkedSkillKeys.has(skill.skillKey)) return false;
          linkedSkillKeys.add(skill.skillKey);
          return true;
        });
        if (!skills.length) continue;
        const branchId = `branch:${branch.key}`;
        nodes.push({ id: branchId, kind: "branch", label: branch.label });
        edges.push({ from: "context", to: branchId });
        for (const skill of skills) {
          const id = `skill:${skill.skillKey}`;
          if (!nodeIds.has(id)) {
            nodeIds.add(id);
            nodes.push({ id, kind: "skill", label: skill.skillLabel, ...skill, replayTo: await replayFor(skill.skillKey, userId) });
          }
          edges.push({ from: branchId, to: id });
        }
      }
      const includedSkillCount = nodes.filter((node) => node.kind === "skill").length;
      const availableSkillCount = new Set(allSkills.map((skill) => skill.skillKey)).size;
      return {
        context: selected,
        edges,
        evidenceSyncStatus: profile.evidenceSyncStatus,
        nodes,
        omittedSkillCount: Math.max(0, availableSkillCount - includedSkillCount),
      };
    },
  };
}
