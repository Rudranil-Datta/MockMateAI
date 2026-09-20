import { randomUUID } from "node:crypto";

import InterviewSession, {
  maxQuestionsPerInterview,
} from "../models/InterviewSession.js";
import { AppError } from "../utils/AppError.js";
import { getOwnedResourceFilter } from "../utils/getOwnedResourceFilter.js";
import { createResumeService } from "./resumeService.js";

const evaluationLeaseMs = 30_000;
const questionGenerationLeaseMs = 30_000;

function toQuestion(question) {
  return {
    id: question.id,
    order: question.order,
    prompt: question.prompt,
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

function toAnswerResult(answer) {
  return {
    answer: toAnswer(answer),
    feedback: toFeedback(answer.feedback),
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
  };
}

function toSession(session) {
  return {
    ...toInterview(session),
    ...(session.completedAt
      ? { completedAt: session.completedAt.toISOString() }
      : {}),
    ...(session.summary ? { summary: toSummary(session.summary) } : {}),
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

export function createInterviewService({
  aiProviderService,
  resumeService = createResumeService(),
}) {
  async function releaseEvaluationClaim({
    answerId,
    claimId,
    interviewId,
    questionId,
    userId,
  }) {
    await InterviewSession.updateOne(
      {
        ...getOwnedResourceFilter(interviewId, userId),
        status: "active",
      },
      {
        $set: {
          "questions.$[question].answers.$[answer].evaluationStatus":
            "not_started",
        },
        $unset: {
          "questions.$[question].answers.$[answer].evaluationClaimId": "",
          "questions.$[question].answers.$[answer].evaluationStartedAt": "",
        },
      },
      {
        arrayFilters: [
          { "question._id": questionId },
          {
            "answer._id": answerId,
            "answer.evaluationClaimId": claimId,
            "answer.evaluationStatus": "pending",
          },
        ],
      },
    );
  }

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
    interviewId,
    prompt,
    userId,
  }) {
    return InterviewSession.findOneAndUpdate(
      {
        ...getOwnedResourceFilter(interviewId, userId),
        "questionGeneration.claimId": claimId,
      },
      { $set: { "questionGeneration.prompt": prompt } },
      { returnDocument: "after", runValidators: true },
    );
  }

  async function finalizeQuestionGeneration({
    claimId,
    expectedQuestionCount,
    generationKey,
    interviewId,
    prompt,
    status,
    userId,
  }) {
    const generatedAt = new Date();
    const update = {
      $push: {
        questions: {
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

      return toSession(session);
    },

    async startInterview({
      userId,
      idempotencyKey,
      interviewType,
      level,
      resumeId,
    }) {
      let session = await InterviewSession.findOne({
        startRequestId: idempotencyKey,
        userId,
      });
      let resumeContext;

      if (!session) {
        resumeContext = resumeId
          ? await resumeService.getOwnedResumeContext({ resumeId, userId })
          : undefined;

        try {
          session = await InterviewSession.create({
            interviewType,
            level,
            ...(resumeId ? { resumeId } : {}),
            startRequestId: idempotencyKey,
            status: "created",
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
      if (
        !session ||
        session.interviewType !== interviewType ||
        session.level !== level ||
        persistedResumeId !== resumeId
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
          expectedQuestionCount: 0,
          generationKey: idempotencyKey,
          interviewId: session.id,
          prompt: session.questionGeneration.prompt,
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
        const question = await aiProviderService.generateQuestion({
          interviewType,
          level,
          previousQuestions: [],
          resumeContext,
        });
        const promptSession = await persistGeneratedQuestion({
          claimId: claim.claimId,
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
          expectedQuestionCount:
            session.questionGeneration.expectedQuestionCount,
          generationKey: idempotencyKey,
          interviewId,
          prompt: session.questionGeneration.prompt,
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
        const resumeContext = claim.session.resumeId
          ? await resumeService.getOwnedResumeContext({
              resumeId: claim.session.resumeId,
              userId,
            })
          : undefined;
        const question = await aiProviderService.generateQuestion({
          interviewType: claim.session.interviewType,
          level: claim.session.level,
          previousQuestions: claim.session.questions.map(
            ({ prompt }) => prompt,
          ),
          resumeContext,
        });
        const promptSession = await persistGeneratedQuestion({
          claimId: claim.claimId,
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
          expectedQuestionCount,
          generationKey: idempotencyKey,
          interviewId,
          prompt: question.prompt,
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

      if (answer.evaluationStatus === "completed" || answer.feedback) {
        if (answer.evaluationKey === idempotencyKey && answer.feedback) {
          return toAnswerResult(answer);
        }

        throw new AppError(
          "ANSWER_ALREADY_SUBMITTED",
          "An answer has already been submitted for this question.",
          { status: 409 },
        );
      }

      if (answer.evaluationKey && answer.evaluationKey !== idempotencyKey) {
        throw new AppError(
          "ANSWER_ALREADY_SUBMITTED",
          "An answer has already been submitted for this question.",
          { status: 409 },
        );
      }

      const evaluationClaimedBefore = new Date(Date.now() - evaluationLeaseMs);

      if (
        answer.evaluationStatus === "pending" &&
        answer.evaluationStartedAt > evaluationClaimedBefore
      ) {
        throw new AppError(
          "EVALUATION_IN_PROGRESS",
          "Answer evaluation is already in progress. Please wait.",
          { status: 409 },
        );
      }

      const evaluationStartedAt = new Date();
      const evaluationClaimId = randomUUID();
      const claimedSession = await InterviewSession.findOneAndUpdate(
        {
          ...getOwnedResourceFilter(interviewId, userId),
          status: "active",
          questions: {
            $elemMatch: {
              _id: questionId,
              answers: {
                $elemMatch: {
                  _id: answer.id,
                  $and: [
                    {
                      $or: [
                        { evaluationKey: idempotencyKey },
                        { evaluationKey: { $exists: false } },
                      ],
                    },
                    {
                      $or: [
                        { evaluationStatus: "not_started" },
                        {
                          evaluationStartedAt: {
                            $lte: evaluationClaimedBefore,
                          },
                          evaluationStatus: "pending",
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $set: {
            "questions.$[question].answers.$[answer].evaluationClaimId":
              evaluationClaimId,
            "questions.$[question].answers.$[answer].evaluationKey":
              idempotencyKey,
            "questions.$[question].answers.$[answer].evaluationStartedAt":
              evaluationStartedAt,
            "questions.$[question].answers.$[answer].evaluationStatus":
              "pending",
          },
        },
        {
          arrayFilters: [
            { "question._id": questionId },
            { "answer._id": answer.id },
          ],
          returnDocument: "after",
          runValidators: true,
        },
      );

      if (!claimedSession) {
        throw new AppError(
          "EVALUATION_SUBMISSION_CONFLICT",
          "Interview changed. Please try again.",
          { status: 409 },
        );
      }

      answer = claimedSession.questions.id(questionId).answers.id(answer.id);

      let evaluationOutput = answer.evaluationOutput;
      if (!evaluationOutput) {
        try {
          const feedback = await aiProviderService.evaluateAnswer({
            answer: answer.text,
            interviewType: session.interviewType,
            level: session.level,
            question: question.prompt,
          });
          evaluationOutput = { ...feedback, evaluatedAt: new Date() };

          const stagedSession = await InterviewSession.findOneAndUpdate(
            {
              ...getOwnedResourceFilter(interviewId, userId),
              status: "active",
              questions: {
                $elemMatch: {
                  _id: questionId,
                  answers: {
                    $elemMatch: {
                      _id: answer.id,
                      evaluationClaimId,
                      evaluationStatus: "pending",
                    },
                  },
                },
              },
            },
            {
              $set: {
                "questions.$[question].answers.$[answer].evaluationOutput":
                  evaluationOutput,
              },
            },
            {
              arrayFilters: [
                { "question._id": questionId },
                {
                  "answer._id": answer.id,
                  "answer.evaluationClaimId": evaluationClaimId,
                  "answer.evaluationStatus": "pending",
                },
              ],
              returnDocument: "after",
              runValidators: true,
            },
          );

          if (!stagedSession) {
            throw new AppError(
              "EVALUATION_SUBMISSION_CONFLICT",
              "Interview changed. Please try again.",
              { status: 409 },
            );
          }
        } catch (error) {
          await releaseEvaluationClaim({
            answerId: answer.id,
            claimId: evaluationClaimId,
            interviewId,
            questionId,
            userId,
          }).catch(() => undefined);
          throw error;
        }
      }

      let evaluatedSession;
      try {
        evaluatedSession = await InterviewSession.findOneAndUpdate(
          {
            ...getOwnedResourceFilter(interviewId, userId),
            status: "active",
            questions: {
              $elemMatch: {
                _id: questionId,
                answers: {
                  $elemMatch: {
                    _id: answer.id,
                    evaluationClaimId,
                    evaluationStatus: "pending",
                  },
                },
              },
            },
          },
          {
            $set: {
              "questions.$[question].answers.$[answer].evaluationStatus":
                "completed",
              "questions.$[question].answers.$[answer].feedback": {
                accuracyScore: evaluationOutput.accuracyScore,
                clarityScore: evaluationOutput.clarityScore,
                confidenceScore: evaluationOutput.confidenceScore,
                evaluatedAt: evaluationOutput.evaluatedAt,
                improvements: evaluationOutput.improvements,
                nextStep: evaluationOutput.nextStep,
                overallScore: evaluationOutput.overallScore,
                strengths: evaluationOutput.strengths,
              },
            },
            $unset: {
              "questions.$[question].answers.$[answer].evaluationClaimId": "",
              "questions.$[question].answers.$[answer].evaluationOutput": "",
              "questions.$[question].answers.$[answer].evaluationStartedAt": "",
            },
          },
          {
            arrayFilters: [
              { "question._id": questionId },
              {
                "answer._id": answer.id,
                "answer.evaluationClaimId": evaluationClaimId,
                "answer.evaluationStatus": "pending",
              },
            ],
            returnDocument: "after",
            runValidators: true,
          },
        );
      } catch (error) {
        await releaseEvaluationClaim({
          answerId: answer.id,
          claimId: evaluationClaimId,
          interviewId,
          questionId,
          userId,
        }).catch(() => undefined);
        throw error;
      }

      if (!evaluatedSession) {
        await releaseEvaluationClaim({
          answerId: answer.id,
          claimId: evaluationClaimId,
          interviewId,
          questionId,
          userId,
        }).catch(() => undefined);
        throw new AppError(
          "EVALUATION_SUBMISSION_CONFLICT",
          "Interview changed. Please try again.",
          { status: 409 },
        );
      }

      const evaluatedAnswer = evaluatedSession.questions
        .id(questionId)
        .answers.id(answer.id);
      return toAnswerResult(evaluatedAnswer);
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
