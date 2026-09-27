import { randomUUID } from "node:crypto";

import InterviewSession from "../models/InterviewSession.js";
import { AppError } from "../utils/AppError.js";
import { getOwnedResourceFilter } from "../utils/getOwnedResourceFilter.js";

const evaluationLeaseMs = 30_000;

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

export function createAnswerEvaluationService({ aiProviderService }) {
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

  return {
    async evaluateSavedAnswer({
      answerId,
      idempotencyKey,
      interviewId,
      questionId,
      userId,
    }) {
      const session = await InterviewSession.findOne(
        getOwnedResourceFilter(interviewId, userId),
      );

      if (!session) {
        throw new AppError("INTERVIEW_NOT_FOUND", "Interview not found.", {
          status: 404,
        });
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

      let answer = question.answers.id(answerId);
      if (!answer || answer.evaluationKey !== idempotencyKey) {
        throw new AppError(
          "EVALUATION_SUBMISSION_CONFLICT",
          "Interview changed. Please try again.",
          { status: 409 },
        );
      }

      if (answer.evaluationStatus === "completed" || answer.feedback) {
        if (answer.feedback) {
          return toAnswerResult(answer);
        }

        throw new AppError(
          "EVALUATION_SUBMISSION_CONFLICT",
          "Interview changed. Please try again.",
          { status: 409 },
        );
      }

      const staleBefore = new Date(Date.now() - evaluationLeaseMs);
      if (
        answer.evaluationStatus === "pending" &&
        answer.evaluationStartedAt > staleBefore
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
                  evaluationKey: idempotencyKey,
                  $or: [
                    { evaluationStatus: "not_started" },
                    {
                      evaluationStartedAt: { $lte: staleBefore },
                      evaluationStatus: "pending",
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
            interviewType: claimedSession.interviewType,
            level: claimedSession.level,
            question: claimedSession.questions.id(questionId).prompt,
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

      return toAnswerResult(
        evaluatedSession.questions.id(questionId).answers.id(answer.id),
      );
    },
  };
}
