import InterviewSession from "../models/InterviewSession.js";
import SkillEvidence from "../models/SkillEvidence.js";
import { getOwnedResourceFilter } from "../utils/getOwnedResourceFilter.js";

const outcomeValues = { strong: 100, partial: 65, weak: 30, missing: 0 };
const difficultyWeights = { beginner: 0.8, intermediate: 1, advanced: 1.2 };
const evidenceWeights = { direct: 1, supporting: 0.75 };
const projectSkillLabels = {
  architecture: "Architecture",
  "claimed-results": "Claimed results",
  decisions: "Decisions",
  responsibilities: "Responsibilities",
  tradeoffs: "Trade-offs",
  "technology-choices": "Technology choices",
};

function recencyWeight(ageDays) {
  if (ageDays <= 30) return 1;
  if (ageDays <= 90) return 0.85;
  return 0.7;
}

function skillLabel(session, skillKey) {
  return (
    session.contextSnapshot?.analysis?.skills.find(
      ({ key }) => key === skillKey,
    )?.label ||
    session.skillContextSnapshot?.find(({ key }) => key === skillKey)?.label ||
    projectSkillLabels[skillKey]
  );
}

function isDuplicateOnly(error) {
  return (
    error?.code === 11000 ||
    (Array.isArray(error?.writeErrors) &&
      error.writeErrors.length > 0 &&
      error.writeErrors.every(({ code }) => code === 11000))
  );
}

function profileSkill(skillKey, evidence, currentTime) {
  const latest = evidence.slice(0, 20);
  const weighted = latest.map((item) => {
    const ageDays = Math.max(0, (currentTime - item.createdAt) / 86_400_000);
    const weight =
      difficultyWeights[item.difficulty] *
      evidenceWeights[item.evidenceStrength] *
      recencyWeight(ageDays);
    return { value: outcomeValues[item.outcome], weight };
  });
  const masteryScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        weighted.reduce((total, item) => total + item.value * item.weight, 0) /
          weighted.reduce((total, item) => total + item.weight, 0),
      ),
    ),
  );
  const sessionCount = new Set(
    latest.map(({ sessionId }) => sessionId.toString()),
  ).size;
  const confidence =
    latest.length < 3 || sessionCount < 2
      ? "provisional"
      : latest.length <= 5
        ? "emerging"
        : "established";
  return {
    confidence,
    evidenceCount: latest.length,
    lastPracticedAt: latest[0].createdAt.toISOString(),
    masteryLabel:
      masteryScore < 40
        ? "needs_work"
        : masteryScore < 70
          ? "developing"
          : masteryScore < 85
            ? "capable"
            : "strong",
    masteryScore,
    skillKey,
    skillLabel: latest[0].skillLabel,
  };
}

export function createSkillEvidenceService({
  interviewSessionModel = InterviewSession,
  now = () => new Date(),
  skillEvidenceModel = SkillEvidence,
} = {}) {
  async function reconcileSession({ session, userId }) {
    const writes = [];
    for (const question of session.questions) {
      for (const answer of question.answers) {
        if (
          answer.evaluationStatus !== "completed" ||
          !answer.skillEvidenceOutput?.length
        )
          continue;
        for (const output of answer.skillEvidenceOutput) {
          const label = skillLabel(session, output.skillKey);
          if (!label) continue;
          writes.push({
            updateOne: {
              filter: {
                answerId: answer._id,
                skillKey: output.skillKey,
                userId,
              },
              update: {
                $setOnInsert: {
                  answerId: answer._id,
                  difficulty: question.difficulty,
                  evidenceStrength: output.evidenceStrength,
                  outcome: output.outcome,
                  questionId: question._id,
                  reasonCode: output.reasonCode,
                  sessionId: session._id,
                  skillKey: output.skillKey,
                  skillLabel: label,
                  userId,
                },
              },
              upsert: true,
            },
          });
        }
      }
    }
    if (writes.length) {
      try {
        await skillEvidenceModel.bulkWrite(writes, { ordered: false });
      } catch (error) {
        if (!isDuplicateOnly(error)) throw error;
      }
    }
    await interviewSessionModel.updateOne(
      {
        ...getOwnedResourceFilter(session.id, userId),
        evidenceSyncStatus: "pending",
      },
      {
        $set: { evidenceSyncStatus: "ready" },
        $unset: {
          "questions.$[].answers.$[].skillEvidenceOutput": "",
        },
      },
    );
  }

  async function buildProfile({ hasPendingSync, userId }) {
    const currentTime = now();
    const cutoff = new Date(currentTime.getTime() - 180 * 86_400_000);
    const evidence = (
      await skillEvidenceModel
        .find({ userId, createdAt: { $gte: cutoff } })
        .sort({ createdAt: -1 })
        .lean()
    ).filter(({ createdAt }) => createdAt >= cutoff);
    const bySkill = new Map();
    for (const item of evidence) {
      const entries = bySkill.get(item.skillKey) || [];
      entries.push(item);
      bySkill.set(item.skillKey, entries);
    }
    const skills = [...bySkill.entries()]
      .map(([skillKey, entries]) =>
        profileSkill(skillKey, entries, currentTime),
      )
      .sort(
        (left, right) =>
          left.masteryScore - right.masteryScore ||
          right.evidenceCount - left.evidenceCount ||
          left.skillKey.localeCompare(right.skillKey),
      )
      .slice(0, 30);
    const recommended = skills
      .filter(({ confidence }) => confidence !== "established")
      .sort(
        (left, right) =>
          left.masteryScore - right.masteryScore ||
          new Date(right.lastPracticedAt) - new Date(left.lastPracticedAt) ||
          left.skillKey.localeCompare(right.skillKey),
      )[0];
    return {
      evidenceSyncStatus: hasPendingSync ? "pending" : "ready",
      recommendedAction: recommended
        ? { skillKey: recommended.skillKey, type: "targeted_practice" }
        : null,
      skills,
    };
  }

  return {
    async getRetestComparison({ session, userId }) {
      if (
        session.sessionPurpose !== "targeted_practice" ||
        session.evidenceSyncStatus !== "ready" ||
        !session.focusSkillKey
      )
        return undefined;
      const currentTime = now();
      const cutoff = new Date(currentTime.getTime() - 180 * 86_400_000);
      const evidence = await skillEvidenceModel
        .find({
          createdAt: { $gte: cutoff },
          skillKey: session.focusSkillKey,
          userId,
        })
        .sort({ createdAt: -1 })
        .lean();
      const sessionId = session.id.toString();
      const prior = evidence.filter(
        (item) =>
          item.sessionId.toString() !== sessionId &&
          item.createdAt <= session.startedAt,
      );
      if (
        !prior.length ||
        !evidence.some((item) => item.sessionId.toString() === sessionId)
      )
        return undefined;
      const previous = profileSkill(session.focusSkillKey, prior, currentTime);
      const current = profileSkill(
        session.focusSkillKey,
        evidence,
        currentTime,
      );
      return {
        currentConfidence: current.confidence,
        currentMasteryScore: current.masteryScore,
        previousConfidence: previous.confidence,
        previousMasteryScore: previous.masteryScore,
        skillKey: current.skillKey,
        skillLabel: current.skillLabel,
      };
    },

    async getOwnedWeakSkill({ skillKey, userId }) {
      const profile = await this.getProfile({ userId });
      return profile.skills.find(
        (skill) => skill.skillKey === skillKey && skill.masteryScore < 70,
      );
    },

    async synchronizeSession({ interviewId, userId }) {
      const session = await interviewSessionModel.findOne(
        getOwnedResourceFilter(interviewId, userId),
      );
      if (!session || session.evidenceSyncStatus !== "pending") return;
      await reconcileSession({ session, userId });
    },

    async getProfile({ userId }) {
      const pendingSessions = await interviewSessionModel
        .find({
          evidenceSyncStatus: "pending",
          userId,
        })
        .sort({ updatedAt: 1 })
        .limit(50);
      let hasPendingSync = false;
      for (const session of pendingSessions) {
        try {
          await reconcileSession({ session, userId });
        } catch {
          // Feedback remains available; this read remains safe while recovery waits.
          hasPendingSync = true;
        }
      }
      return buildProfile({ hasPendingSync, userId });
    },

    async getReadOnlyProfile({ userId }) {
      const pendingSession = await interviewSessionModel.exists({
        evidenceSyncStatus: "pending",
        userId,
      });
      return buildProfile({ hasPendingSync: Boolean(pendingSession), userId });
    },
  };
}
