import { randomUUID } from "node:crypto";

import InterviewSession, {
  maxQuestionsPerInterview,
} from "../models/InterviewSession.js";
import { AppError } from "../utils/AppError.js";
import { getOwnedResourceFilter } from "../utils/getOwnedResourceFilter.js";
import { deriveProjectChallengeDirective } from "./projectDefenseChallengeService.js";
import { createResumeService } from "./resumeService.js";

const questionGenerationLeaseMs = 30_000;

function toQuestion(question) {
  const hasAdaptiveMetadata = [
    question.topicKey,
    question.testedSkillKeys,
    question.difficulty,
    question.decisionType,
    question.reasonCode,
  ].every((value) => value !== undefined);
  return {
    id: question.id,
    order: question.order,
    prompt: question.prompt,
    ...(hasAdaptiveMetadata
      ? {
          decisionType: question.decisionType,
          difficulty: question.difficulty,
          ...(question.challengeAxis
            ? {
                challengeAnchorKey: question.challengeAnchorKey,
                challengeAxis: question.challengeAxis,
              }
            : {}),
          ...(question.parentQuestionId
            ? { parentQuestionId: question.parentQuestionId.toString() }
            : {}),
          reasonCode: question.reasonCode,
          testedSkillKeys: [...question.testedSkillKeys],
          topicKey: question.topicKey,
        }
      : {}),
  };
}

function toAnswer(answer) {
  return {
    id: answer.id,
    inputMode: answer.inputMode,
    submittedAt: answer.submittedAt.toISOString(),
    text: answer.text,
  };
}

function toFeedback(feedback) {
  return {
    accuracyScore: feedback.accuracyScore,
    clarityScore: feedback.clarityScore,
    confidenceScore: feedback.confidenceScore,
    improvements: feedback.improvements,
    nextStep: feedback.nextStep,
    overallScore: feedback.overallScore,
    strengths: feedback.strengths,
  };
}

function toSummary(summary) {
  return {
    accuracyScore: summary.accuracyScore,
    clarityScore: summary.clarityScore,
    confidenceScore: summary.confidenceScore,
    improvements: summary.improvements,
    overallScore: summary.overallScore,
    recommendation: summary.recommendation,
    strengths: summary.strengths,
  };
}

function toInterview(session) {
  return {
    id: session.id,
    interviewType: session.interviewType,
    level: session.level,
    startedAt: session.startedAt.toISOString(),
    status: session.status,
    ...(session.sessionPurpose
      ? { sessionPurpose: session.sessionPurpose }
      : {}),
    ...(session.focusSkillKey ? { focusSkillKey: session.focusSkillKey } : {}),
  };
}

function toSession(session, retestComparison) {
  return {
    ...toInterview(session),
    ...(session.completedAt
      ? { completedAt: session.completedAt.toISOString() }
      : {}),
    ...(session.summary ? { summary: toSummary(session.summary) } : {}),
    ...(["Role Simulation", "Project Defense"].includes(
      session.interviewType,
    ) || session.sessionPurpose === "targeted_practice"
      ? { evidenceSyncStatus: session.evidenceSyncStatus }
      : {}),
    ...(session.contextSnapshot?.displayLabel
      ? {
          contextSnapshot: {
            kind: session.contextSnapshot.kind,
            label: session.contextSnapshot.displayLabel,
          },
        }
      : {}),
    ...(retestComparison ? { retestComparison } : {}),
    questions: session.questions.map((question) => ({
      ...toQuestion(question),
      answers: question.answers.map((answer) => ({
        ...toAnswer(answer),
        ...(answer.feedback ? { feedback: toFeedback(answer.feedback) } : {}),
      })),
    })),
  };
}

function averageScore(answers, scoreName) {
  return Math.round(
    answers.reduce((total, answer) => total + answer.feedback[scoreName], 0) /
      answers.length,
  );
}

function uniqueFeedbackItems(answers, itemName) {
  return [
    ...new Set(
      answers.flatMap((answer) => answer.feedback[itemName]).filter(Boolean),
    ),
  ].slice(0, 3);
}

function createSummary(evaluatedAnswers) {
  const latestAnswer = evaluatedAnswers.at(-1);

  return {
    accuracyScore: averageScore(evaluatedAnswers, "accuracyScore"),
    clarityScore: averageScore(evaluatedAnswers, "clarityScore"),
    confidenceScore: averageScore(evaluatedAnswers, "confidenceScore"),
    improvements: uniqueFeedbackItems(evaluatedAnswers, "improvements"),
    overallScore: averageScore(evaluatedAnswers, "overallScore"),
    recommendation: latestAnswer.feedback.nextStep,
    strengths: uniqueFeedbackItems(evaluatedAnswers, "strengths"),
  };
}

function interviewNotFound() {
  return new AppError("INTERVIEW_NOT_FOUND", "Interview not found.", {
    status: 404,
  });
}

function questionRequestConflict() {
  return new AppError(
    "QUESTION_REQUEST_CONFLICT",
    "Question generation is already in progress. Please try again.",
    { status: 409 },
  );
}

function questionNotReady() {
  return new AppError(
    "QUESTION_NOT_READY",
    "Complete feedback for the current question before continuing.",
    { status: 409 },
  );
}

function roleCoveragePlan(snapshot) {
  return snapshot.analysis.skills
    .map((skill, index) => ({ index, skill }))
    .sort(
      (left, right) =>
        right.skill.weight - left.skill.weight || left.index - right.index,
    )
    .map(({ skill }) => ({
      label: skill.label,
      skillKeys: [skill.key],
      topicKey: skill.key,
    }));
}

function roleContextSummary(snapshot) {
  const weightedSkills = snapshot.analysis.skills
    .map((skill, index) => ({ index, skill }))
    .sort(
      (left, right) =>
        right.skill.weight - left.skill.weight || left.index - right.index,
    )
    .map(({ skill }) => skill);
  return JSON.stringify({
    requirements: snapshot.analysis.requirements,
    roleSummary: snapshot.analysis.roleSummary,
    skills: weightedSkills,
  });
}

const projectCoverageDefinitions = [
  ["architecture", "Architecture", "architecture"],
  ["technology-choices", "Technology choices", "technologies"],
  ["responsibilities", "Responsibilities", "responsibilities"],
  ["decisions", "Decisions", "decisions"],
  ["tradeoffs", "Trade-offs", "tradeoffs"],
  ["claimed-results", "Claimed results", "claims"],
];

function projectCoveragePlan(snapshot) {
  return projectCoverageDefinitions
    .filter(([, , factKey]) => snapshot.facts[factKey].length > 0)
    .map(([topicKey, label]) => ({
      label,
      skillKeys: [topicKey],
      topicKey,
    }));
}

function projectContextSummary(snapshot) {
  return JSON.stringify(snapshot.facts);
}

function adaptiveQuestionHistory(session) {
  return session.questions.map((question) => {
    const answer = question.answers[0];
    if (
      !answer ||
      answer.evaluationStatus !== "completed" ||
      !answer.feedback
    ) {
      throw questionNotReady();
    }
    const parentQuestion = question.parentQuestionId
      ? session.questions.find(
          ({ id }) => id.toString() === question.parentQuestionId.toString(),
        )
      : null;
    return {
      decisionType: question.decisionType,
      difficulty: question.difficulty,
      order: question.order,
      overallScore: answer.feedback.overallScore,
      parentQuestionOrder: parentQuestion?.order ?? null,
      prompt: question.prompt,
      reasonCode: question.reasonCode,
      testedSkillKeys: [...question.testedSkillKeys],
      topicKey: question.topicKey,
    };
  });
}

function roleAdaptiveInput(session) {
  if (!session.contextSnapshot?.analysis) throw questionRequestConflict();
  return {
    challengeDirective: null,
    contextSummary: roleContextSummary(session.contextSnapshot),
    coveragePlan: roleCoveragePlan(session.contextSnapshot),
    focusSkillKey: null,
    interviewType: "Role Simulation",
    level: session.level,
    previousQuestions: adaptiveQuestionHistory(session),
    sessionPurpose: "standard",
  };
}

function adaptiveInput(session) {
  if (session.sessionPurpose === "targeted_practice") {
    const skill = session.skillContextSnapshot?.find(
      ({ key }) => key === session.focusSkillKey,
    );
    if (!skill) throw questionRequestConflict();
    return {
      challengeDirective: null,
      contextSummary: null,
      coveragePlan: [
        { label: skill.label, skillKeys: [skill.key], topicKey: skill.key },
      ],
      focusSkillKey: skill.key,
      interviewType: session.interviewType,
      level: session.level,
      previousQuestions: adaptiveQuestionHistory(session),
      sessionPurpose: "targeted_practice",
    };
  }
  if (session.interviewType === "Role Simulation") {
    return roleAdaptiveInput(session);
  }
  if (
    session.interviewType !== "Project Defense" ||
    !session.contextSnapshot?.facts
  ) {
    throw questionRequestConflict();
  }
  const previousQuestions = adaptiveQuestionHistory(session);
  const latestQuestion = session.questions.at(-1);
  const challengeDirective = latestQuestion
    ? deriveProjectChallengeDirective({
        facts: session.contextSnapshot.facts,
        latestAnswer: latestQuestion.answers[0]?.text,
        latestTopicKey: latestQuestion.topicKey,
        previousQuestionCount: session.questions.length,
      })
    : null;
  if (latestQuestion && !challengeDirective) throw questionRequestConflict();
  return {
    challengeDirective,
    contextSummary: projectContextSummary(session.contextSnapshot),
    coveragePlan: projectCoveragePlan(session.contextSnapshot),
    focusSkillKey: null,
    interviewType: "Project Defense",
    level: session.level,
    previousQuestions,
    sessionPurpose: "standard",
  };
}

function isAdaptiveInterview(interviewType) {
  return ["Role Simulation", "Project Defense"].includes(interviewType);
}

export function createInterviewService({
  adaptiveInterviewService,
  aiProviderService,
  answerEvaluationService,
  jobTargetService,
  projectService,
  resumeService = createResumeService(),
  skillEvidenceService,
}) {
  async function claimQuestionGeneration({
    expectedQuestionCount,
    idempotencyKey,
    interviewId,
    status,
    userId,
  }) {
    const claimId = randomUUID();
    const startedAt = new Date();
    const staleBefore = new Date(
      startedAt.getTime() - questionGenerationLeaseMs,
    );
    const session = await InterviewSession.findOneAndUpdate(
      {
        ...getOwnedResourceFilter(interviewId, userId),
        $or: [
          { "questionGeneration.claimId": { $exists: false } },
          { "questionGeneration.startedAt": { $lte: staleBefore } },
        ],
        questions: { $size: expectedQuestionCount },
        status,
      },
      {
        $set: {
          questionGeneration: {
            claimId,
            expectedQuestionCount,
            idempotencyKey,
            startedAt,
          },
        },
      },
      { returnDocument: "after", runValidators: true },
    );

    return { claimId, session };
  }

  async function releaseQuestionGenerationClaim({
    claimId,
    interviewId,
    userId,
  }) {
    try {
      await InterviewSession.updateOne(
        {
          ...getOwnedResourceFilter(interviewId, userId),
          "questionGeneration.claimId": claimId,
        },
        { $unset: { questionGeneration: "" } },
      );
    } catch {
      // A bounded stale-claim lease preserves recovery when the database is down.
    }
  }

  async function persistGeneratedQuestion({
    claimId,
    decision,
    interviewId,
    prompt,
    userId,
  }) {
    if (decision && decision.prompt !== prompt) {
      throw questionRequestConflict();
    }
    return InterviewSession.findOneAndUpdate(
      {
        ...getOwnedResourceFilter(interviewId, userId),
        "questionGeneration.claimId": claimId,
      },
      {
        $set: {
          ...(decision ? { "questionGeneration.decision": decision } : {}),
          "questionGeneration.prompt": prompt,
        },
      },
      { returnDocument: "after", runValidators: true },
    );
  }

  async function finalizeQuestionGeneration({
    claimId,
    decision,
    expectedQuestionCount,
    generationKey,
    interviewId,
    prompt,
    questions = [],
    status,
    userId,
  }) {
    const generatedAt = new Date();
    let adaptiveMetadata = {};
    if (decision) {
      if (
        decision.prompt !== prompt ||
        !decision.topicKey ||
        !Array.isArray(decision.testedSkillKeys) ||
        decision.testedSkillKeys.length === 0 ||
        !decision.difficulty ||
        !decision.decisionType ||
        !decision.reasonCode ||
        decision.parentQuestionOrder === undefined
      ) {
        throw questionRequestConflict();
      }
      const parentQuestion =
        decision.parentQuestionOrder === null ||
        decision.parentQuestionOrder === undefined
          ? null
          : questions.find(
              ({ order }) => order === decision.parentQuestionOrder,
            );
      if (
        decision.parentQuestionOrder !== null &&
        decision.parentQuestionOrder !== undefined &&
        !parentQuestion
      ) {
        throw questionRequestConflict();
      }
      adaptiveMetadata = {
        ...(decision.challengeAxis
          ? {
              challengeAnchorKey: decision.challengeAnchorKey,
              challengeAxis: decision.challengeAxis,
            }
          : {}),
        decisionType: decision.decisionType,
        difficulty: decision.difficulty,
        ...(parentQuestion ? { parentQuestionId: parentQuestion.id } : {}),
        reasonCode: decision.reasonCode,
        testedSkillKeys: [...decision.testedSkillKeys],
        topicKey: decision.topicKey,
      };
    }
    const update = {
      $push: {
        questions: {
          ...adaptiveMetadata,
          generatedAt,
          generationKey,
          order: expectedQuestionCount + 1,
          prompt,
        },
      },
      ...(status === "created"
        ? { $set: { startedAt: generatedAt, status: "active" } }
        : {}),
      $unset: { questionGeneration: "" },
    };

    return InterviewSession.findOneAndUpdate(
      {
        ...getOwnedResourceFilter(interviewId, userId),
        "questionGeneration.claimId": claimId,
        questions: { $size: expectedQuestionCount },
        status,
      },
      update,
      { returnDocument: "after", runValidators: true },
    );
  }

  return {
    async getInterview({ interviewId, userId }) {
      const session = await InterviewSession.findOne(
        getOwnedResourceFilter(interviewId, userId),
      );

      if (!session) {
        throw interviewNotFound();
      }

      const retestComparison =
        typeof skillEvidenceService?.getRetestComparison === "function"
          ? await skillEvidenceService.getRetestComparison({ session, userId })
          : undefined;
      return toSession(session, retestComparison);
    },

    async startInterview({
      userId,
      idempotencyKey,
      interviewType,
      jobTargetId,
      level,
      projectId,
      resumeId,
      sessionPurpose,
      focusSkillKey,
    }) {
      let session = await InterviewSession.findOne({
        startRequestId: idempotencyKey,
        userId,
      });
      let resumeContext;
      let contextSnapshot;

      if (!session) {
        const focusSkill =
          sessionPurpose === "targeted_practice"
            ? await skillEvidenceService.getOwnedWeakSkill({
                skillKey: focusSkillKey,
                userId,
              })
            : undefined;
        if (sessionPurpose === "targeted_practice" && !focusSkill) {
          throw new AppError("SKILL_NOT_FOUND", "Skill not found.", {
            status: 404,
          });
        }
        if (interviewType === "Role Simulation") {
          contextSnapshot = await jobTargetService.getReadyTargetSnapshot({
            targetId: jobTargetId,
            userId,
          });
        } else if (interviewType === "Project Defense") {
          contextSnapshot = await projectService.getConfirmedProjectSnapshot({
            projectId,
            userId,
          });
        }
        resumeContext = resumeId
          ? await resumeService.getOwnedResumeContext({ resumeId, userId })
          : undefined;

        try {
          session = await InterviewSession.create({
            interviewType,
            ...(contextSnapshot ? { contextSnapshot } : {}),
            ...(jobTargetId ? { jobTargetId } : {}),
            level,
            ...(projectId ? { projectId } : {}),
            ...(resumeId ? { resumeId } : {}),
            ...(focusSkill
              ? {
                  focusSkillKey,
                  skillContextSnapshot: [
                    {
                      confidenceLabel: focusSkill.confidence,
                      key: focusSkill.skillKey,
                      label: focusSkill.skillLabel,
                      masteryScore: focusSkill.masteryScore,
                    },
                  ],
                }
              : {}),
            startRequestId: idempotencyKey,
            status: "created",
            ...(sessionPurpose ? { sessionPurpose } : {}),
            userId,
          });
        } catch (error) {
          if (error?.code !== 11000) {
            throw error;
          }

          session = await InterviewSession.findOne({
            startRequestId: idempotencyKey,
            userId,
          });
        }
      }

      const persistedResumeId = session?.resumeId?.toString();
      const persistedJobTargetId = session?.jobTargetId?.toString();
      const persistedProjectId = session?.projectId?.toString();
      if (
        !session ||
        session.interviewType !== interviewType ||
        session.level !== level ||
        persistedResumeId !== resumeId ||
        persistedJobTargetId !== jobTargetId ||
        persistedProjectId !== projectId ||
        ((isAdaptiveInterview(interviewType) ||
          sessionPurpose === "targeted_practice") &&
          session.sessionPurpose !== sessionPurpose)
      ) {
        throw new AppError(
          "IDEMPOTENCY_KEY_REUSED",
          "Request identifier was already used for different interview settings.",
          { status: 409 },
        );
      }

      if (session.status === "active" && session.questions.length >= 1) {
        return {
          interview: toInterview(session),
          question: toQuestion(session.questions[0]),
        };
      }

      if (session.status !== "created" || session.questions.length !== 0) {
        throw questionRequestConflict();
      }

      if (
        session.questionGeneration?.idempotencyKey === idempotencyKey &&
        session.questionGeneration.prompt
      ) {
        const recoveredSession = await finalizeQuestionGeneration({
          claimId: session.questionGeneration.claimId,
          decision: session.questionGeneration.decision,
          expectedQuestionCount: 0,
          generationKey: idempotencyKey,
          interviewId: session.id,
          prompt: session.questionGeneration.prompt,
          questions: session.questions,
          status: "created",
          userId,
        });

        if (!recoveredSession) {
          throw questionRequestConflict();
        }

        return {
          interview: toInterview(recoveredSession),
          question: toQuestion(recoveredSession.questions[0]),
        };
      }

      if (resumeId && resumeContext === undefined) {
        resumeContext = await resumeService.getOwnedResumeContext({
          resumeId,
          userId,
        });
      }

      const claim = await claimQuestionGeneration({
        expectedQuestionCount: 0,
        idempotencyKey,
        interviewId: session.id,
        status: "created",
        userId,
      });

      if (!claim.session) {
        const completedSession = await InterviewSession.findOne({
          startRequestId: idempotencyKey,
          userId,
        });

        if (
          completedSession?.status === "active" &&
          completedSession.questions.length === 1
        ) {
          return {
            interview: toInterview(completedSession),
            question: toQuestion(completedSession.questions[0]),
          };
        }

        throw questionRequestConflict();
      }

      let hasDurablePrompt = false;

      try {
        const question =
          isAdaptiveInterview(interviewType) ||
          sessionPurpose === "targeted_practice"
            ? await adaptiveInterviewService.generateNextQuestion(
                adaptiveInput(claim.session),
              )
            : await aiProviderService.generateQuestion({
                interviewType,
                level,
                previousQuestions: [],
                resumeContext,
              });
        const promptSession = await persistGeneratedQuestion({
          claimId: claim.claimId,
          ...(isAdaptiveInterview(interviewType) ||
          sessionPurpose === "targeted_practice"
            ? { decision: question }
            : {}),
          interviewId: session.id,
          prompt: question.prompt,
          userId,
        });

        if (!promptSession) {
          throw questionRequestConflict();
        }

        hasDurablePrompt = true;
        const updatedSession = await finalizeQuestionGeneration({
          claimId: claim.claimId,
          ...(isAdaptiveInterview(interviewType) ||
          sessionPurpose === "targeted_practice"
            ? { decision: question }
            : {}),
          expectedQuestionCount: 0,
          generationKey: idempotencyKey,
          interviewId: session.id,
          prompt: question.prompt,
          status: "created",
          userId,
        });

        if (!updatedSession) {
          throw questionRequestConflict();
        }

        session = updatedSession;
      } catch (error) {
        if (!hasDurablePrompt) {
          await releaseQuestionGenerationClaim({
            claimId: claim.claimId,
            interviewId: session.id,
            userId,
          });
        }
        throw error;
      }

      return {
        interview: toInterview(session),
        question: toQuestion(session.questions[0]),
      };
    },

    async generateNextQuestion({ interviewId, idempotencyKey, userId }) {
      const session = await InterviewSession.findOne(
        getOwnedResourceFilter(interviewId, userId),
      );

      if (!session) {
        throw interviewNotFound();
      }

      const existingQuestion = session.questions.find(
        ({ generationKey }) => generationKey === idempotencyKey,
      );

      if (existingQuestion) {
        return toQuestion(existingQuestion);
      }

      if (
        session.questionGeneration?.idempotencyKey === idempotencyKey &&
        session.questionGeneration.prompt
      ) {
        const recoveredSession = await finalizeQuestionGeneration({
          claimId: session.questionGeneration.claimId,
          decision: session.questionGeneration.decision,
          expectedQuestionCount:
            session.questionGeneration.expectedQuestionCount,
          generationKey: idempotencyKey,
          interviewId,
          prompt: session.questionGeneration.prompt,
          questions: session.questions,
          status: "active",
          userId,
        });

        if (!recoveredSession) {
          throw questionRequestConflict();
        }

        return toQuestion(recoveredSession.questions.at(-1));
      }

      if (session.status !== "active") {
        throw new AppError(
          "INTERVIEW_NOT_ACTIVE",
          "Interview is no longer active.",
          { status: 409 },
        );
      }

      if (session.questions.length >= maxQuestionsPerInterview) {
        throw new AppError(
          "QUESTION_LIMIT_REACHED",
          "This interview has reached its question limit.",
          { status: 409 },
        );
      }

      const expectedQuestionCount = session.questions.length;
      const claim = await claimQuestionGeneration({
        expectedQuestionCount,
        idempotencyKey,
        interviewId,
        status: "active",
        userId,
      });

      if (!claim.session) {
        const latestSession = await InterviewSession.findOne(
          getOwnedResourceFilter(interviewId, userId),
        );
        const completedQuestion = latestSession?.questions.find(
          ({ generationKey }) => generationKey === idempotencyKey,
        );

        if (completedQuestion) {
          return toQuestion(completedQuestion);
        }

        throw questionRequestConflict();
      }

      let hasDurablePrompt = false;

      try {
        const isAdaptive =
          isAdaptiveInterview(claim.session.interviewType) ||
          claim.session.sessionPurpose === "targeted_practice";
        const resumeContext =
          !isAdaptive && claim.session.resumeId
            ? await resumeService.getOwnedResumeContext({
                resumeId: claim.session.resumeId,
                userId,
              })
            : undefined;
        const question = isAdaptive
          ? await adaptiveInterviewService.generateNextQuestion(
              adaptiveInput(claim.session),
            )
          : await aiProviderService.generateQuestion({
              interviewType: claim.session.interviewType,
              level: claim.session.level,
              previousQuestions: claim.session.questions.map(
                ({ prompt }) => prompt,
              ),
              resumeContext,
            });
        const promptSession = await persistGeneratedQuestion({
          claimId: claim.claimId,
          ...(isAdaptive ? { decision: question } : {}),
          interviewId,
          prompt: question.prompt,
          userId,
        });

        if (!promptSession) {
          throw questionRequestConflict();
        }

        hasDurablePrompt = true;
        const updatedSession = await finalizeQuestionGeneration({
          claimId: claim.claimId,
          ...(isAdaptive ? { decision: question } : {}),
          expectedQuestionCount,
          generationKey: idempotencyKey,
          interviewId,
          prompt: question.prompt,
          questions: claim.session.questions,
          status: "active",
          userId,
        });

        if (!updatedSession) {
          throw questionRequestConflict();
        }

        return toQuestion(updatedSession.questions.at(-1));
      } catch (error) {
        if (!hasDurablePrompt) {
          await releaseQuestionGenerationClaim({
            claimId: claim.claimId,
            interviewId,
            userId,
          });
        }
        throw error;
      }
    },

    async submitTextAnswer({
      idempotencyKey,
      interviewId,
      questionId,
      text,
      userId,
    }) {
      const session = await InterviewSession.findOne(
        getOwnedResourceFilter(interviewId, userId),
      );

      if (!session) {
        throw interviewNotFound();
      }

      if (session.status !== "active") {
        throw new AppError(
          "INTERVIEW_NOT_ACTIVE",
          "Interview is no longer active.",
          { status: 409 },
        );
      }

      const question = session.questions.id(questionId);

      if (!question) {
        throw new AppError("QUESTION_NOT_FOUND", "Question not found.", {
          status: 404,
        });
      }

      if (question.voiceTranscription) {
        throw new AppError(
          "ANSWER_SUBMISSION_CONFLICT",
          "A voice answer is already being processed for this question.",
          { status: 409 },
        );
      }

      let answer;

      if (question.answers.length === 0) {
        const submittedAt = new Date();
        const updatedSession = await InterviewSession.findOneAndUpdate(
          {
            ...getOwnedResourceFilter(interviewId, userId),
            status: "active",
            questions: {
              $elemMatch: {
                _id: questionId,
                answers: { $size: 0 },
                voiceTranscription: { $exists: false },
              },
            },
          },
          {
            $push: {
              "questions.$.answers": {
                evaluationKey: idempotencyKey,
                evaluationStatus: "not_started",
                inputMode: "text",
                submittedAt,
                text,
              },
            },
          },
          { returnDocument: "after", runValidators: true },
        );

        if (!updatedSession) {
          throw new AppError(
            "ANSWER_SUBMISSION_CONFLICT",
            "Interview changed. Please try again.",
            { status: 409 },
          );
        }

        answer = updatedSession.questions.id(questionId).answers.at(-1);
      } else {
        answer = question.answers[0];
      }

      if (answer.evaluationKey && answer.evaluationKey !== idempotencyKey) {
        throw new AppError(
          "ANSWER_ALREADY_SUBMITTED",
          "An answer has already been submitted for this question.",
          { status: 409 },
        );
      }

      return answerEvaluationService.evaluateSavedAnswer({
        answerId: answer.id,
        idempotencyKey,
        interviewId,
        questionId,
        userId,
      });
    },

    async completeInterview({ interviewId, userId }) {
      const session = await InterviewSession.findOne(
        getOwnedResourceFilter(interviewId, userId),
      );

      if (!session) {
        throw interviewNotFound();
      }

      if (session.status !== "active") {
        throw new AppError(
          "INTERVIEW_NOT_ACTIVE",
          "Interview is no longer active.",
          { status: 409 },
        );
      }

      if (session.questionGeneration) {
        throw new AppError(
          "QUESTION_GENERATION_IN_PROGRESS",
          "Wait for question generation to finish before completing this interview.",
          { status: 409 },
        );
      }

      const answers = session.questions.flatMap(
        ({ answers: questionAnswers }) => questionAnswers,
      );

      if (
        answers.some(
          ({ evaluationOutput, evaluationStatus }) =>
            evaluationStatus === "pending" || Boolean(evaluationOutput),
        )
      ) {
        throw new AppError(
          "EVALUATION_IN_PROGRESS",
          "Wait for answer feedback before completing this interview.",
          { status: 409 },
        );
      }

      const evaluatedAnswers = answers.filter(
        ({ evaluationStatus, feedback }) =>
          evaluationStatus === "completed" && feedback,
      );

      if (evaluatedAnswers.length === 0) {
        throw new AppError(
          "INTERVIEW_NOT_READY",
          "Submit and receive feedback for an answer before completing this interview.",
          { status: 409 },
        );
      }

      const completedAt = new Date();
      const completedSession = await InterviewSession.findOneAndUpdate(
        {
          ...getOwnedResourceFilter(interviewId, userId),
          questionGeneration: { $exists: false },
          status: "active",
          updatedAt: session.updatedAt,
          $nor: [
            {
              questions: {
                $elemMatch: {
                  answers: { $elemMatch: { evaluationStatus: "pending" } },
                },
              },
            },
            {
              questions: {
                $elemMatch: {
                  answers: {
                    $elemMatch: { evaluationOutput: { $exists: true } },
                  },
                },
              },
            },
          ],
        },
        {
          $set: {
            completedAt,
            status: "completed",
            summary: createSummary(evaluatedAnswers),
          },
        },
        { returnDocument: "after", runValidators: true },
      );

      if (!completedSession) {
        throw new AppError(
          "INTERVIEW_COMPLETION_CONFLICT",
          "Interview changed. Please try again.",
          { status: 409 },
        );
      }

      return toSession(completedSession);
    },
  };
}
