import { randomUUID } from "node:crypto";

import InterviewSession from "../models/InterviewSession.js";
import { AppError } from "../utils/AppError.js";
import { getOwnedResourceFilter } from "../utils/getOwnedResourceFilter.js";

const transcriptionLeaseMs = 30_000;

function interviewNotFound() {
  return new AppError("INTERVIEW_NOT_FOUND", "Interview not found.", {
    status: 404,
  });
}

function transcriptionConflict(
  message = "Voice transcription is already in progress. Please wait.",
) {
  return new AppError("VOICE_TRANSCRIPTION_CONFLICT", message, {
    status: 409,
  });
}

export function createVoiceAnswerService({
  answerEvaluationService,
  transcriptionService,
}) {
  async function findOwnedActiveInterview({ interviewId, userId }) {
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

    return session;
  }

  async function finalizeStagedTranscription({
    claimId,
    idempotencyKey,
    interviewId,
    questionId,
    userId,
  }) {
    return InterviewSession.findOneAndUpdate(
      {
        ...getOwnedResourceFilter(interviewId, userId),
        status: "active",
        questions: {
          $elemMatch: {
            _id: questionId,
            "voiceTranscription.claimId": claimId,
            "voiceTranscription.idempotencyKey": idempotencyKey,
            "voiceTranscription.status": "processing",
            "voiceTranscription.text": { $exists: true },
          },
        },
      },
      {
        $set: {
          "questions.$[question].voiceTranscription.status": "completed",
        },
        $unset: {
          "questions.$[question].voiceTranscription.claimId": "",
          "questions.$[question].voiceTranscription.startedAt": "",
        },
      },
      {
        arrayFilters: [
          {
            "question._id": questionId,
            "question.voiceTranscription.claimId": claimId,
          },
        ],
        returnDocument: "after",
        runValidators: true,
      },
    );
  }

  async function releaseClaim({ claimId, interviewId, questionId, userId }) {
    await InterviewSession.updateOne(
      getOwnedResourceFilter(interviewId, userId),
      { $unset: { "questions.$[question].voiceTranscription": "" } },
      {
        arrayFilters: [
          {
            "question._id": questionId,
            "question.voiceTranscription.claimId": claimId,
            "question.voiceTranscription.text": { $exists: false },
          },
        ],
      },
    );
  }

  async function evaluateVoiceAnswer({
    answer,
    idempotencyKey,
    interviewId,
    questionId,
    userId,
  }) {
    if (
      answer.inputMode !== "voice" ||
      answer.evaluationKey !== idempotencyKey
    ) {
      throw transcriptionConflict(
        "An answer has already been submitted for this question.",
      );
    }

    return answerEvaluationService.evaluateSavedAnswer({
      answerId: answer.id,
      idempotencyKey,
      interviewId,
      questionId,
      userId,
    });
  }

  async function consumeCompletedTranscription({
    idempotencyKey,
    interviewId,
    questionId,
    text,
    userId,
  }) {
    const submittedAt = new Date();
    const session = await InterviewSession.findOneAndUpdate(
      {
        ...getOwnedResourceFilter(interviewId, userId),
        status: "active",
        questions: {
          $elemMatch: {
            _id: questionId,
            answers: { $size: 0 },
            "voiceTranscription.idempotencyKey": idempotencyKey,
            "voiceTranscription.status": "completed",
            "voiceTranscription.text": text,
          },
        },
      },
      {
        $push: {
          "questions.$[question].answers": {
            evaluationKey: idempotencyKey,
            evaluationStatus: "not_started",
            inputMode: "voice",
            submittedAt,
            text,
          },
        },
        $unset: { "questions.$[question].voiceTranscription": "" },
      },
      {
        arrayFilters: [{ "question._id": questionId }],
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!session) {
      const latest = await findOwnedActiveInterview({ interviewId, userId });
      const latestQuestion = latest.questions.id(questionId);
      const existingAnswer = latestQuestion?.answers[0];

      if (existingAnswer) {
        return evaluateVoiceAnswer({
          answer: existingAnswer,
          idempotencyKey,
          interviewId,
          questionId,
          userId,
        });
      }

      throw transcriptionConflict(
        "Interview changed while saving the voice answer. Please retry.",
      );
    }

    const answer = session.questions.id(questionId).answers[0];
    return evaluateVoiceAnswer({
      answer,
      idempotencyKey,
      interviewId,
      questionId,
      userId,
    });
  }

  return {
    async assertOwnedActiveInterview({ interviewId, userId }) {
      await findOwnedActiveInterview({ interviewId, userId });
    },

    async transcribeVoiceAnswer({
      audio,
      idempotencyKey,
      interviewId,
      mimeType,
      questionId,
      userId,
    }) {
      let session = await findOwnedActiveInterview({ interviewId, userId });
      let question = session.questions.id(questionId);

      if (!question) {
        throw new AppError("QUESTION_NOT_FOUND", "Question not found.", {
          status: 404,
        });
      }

      if (question.answers.length > 0) {
        return evaluateVoiceAnswer({
          answer: question.answers[0],
          idempotencyKey,
          interviewId,
          questionId,
          userId,
        });
      }

      const existing = question.voiceTranscription;
      if (existing?.idempotencyKey === idempotencyKey && existing.text) {
        if (existing.status === "completed") {
          return consumeCompletedTranscription({
            idempotencyKey,
            interviewId,
            questionId,
            text: existing.text,
            userId,
          });
        }

        const recoveredSession = await finalizeStagedTranscription({
          claimId: existing.claimId,
          idempotencyKey,
          interviewId,
          questionId,
          userId,
        });

        if (recoveredSession) {
          return consumeCompletedTranscription({
            idempotencyKey,
            interviewId,
            questionId,
            text: recoveredSession.questions.id(questionId).voiceTranscription
              .text,
            userId,
          });
        }
      }

      if (
        existing?.status === "completed" ||
        (existing?.status === "processing" &&
          existing.startedAt > new Date(Date.now() - transcriptionLeaseMs))
      ) {
        throw transcriptionConflict();
      }

      const claimId = randomUUID();
      const startedAt = new Date();
      const staleBefore = new Date(startedAt.getTime() - transcriptionLeaseMs);
      session = await InterviewSession.findOneAndUpdate(
        {
          ...getOwnedResourceFilter(interviewId, userId),
          status: "active",
          questions: {
            $elemMatch: {
              _id: questionId,
              answers: { $size: 0 },
              $or: [
                { voiceTranscription: { $exists: false } },
                {
                  "voiceTranscription.startedAt": { $lte: staleBefore },
                  "voiceTranscription.status": "processing",
                  "voiceTranscription.text": { $exists: false },
                },
              ],
            },
          },
        },
        {
          $set: {
            "questions.$[question].voiceTranscription": {
              claimId,
              idempotencyKey,
              mimeType,
              startedAt,
              status: "processing",
            },
          },
        },
        {
          arrayFilters: [{ "question._id": questionId }],
          returnDocument: "after",
          runValidators: true,
        },
      );

      if (!session) {
        throw transcriptionConflict();
      }

      let hasStagedTranscript = false;

      try {
        const { text } = await transcriptionService.transcribe({
          audio,
          mimeType,
        });
        const completedAt = new Date();
        const stagedSession = await InterviewSession.findOneAndUpdate(
          {
            ...getOwnedResourceFilter(interviewId, userId),
            status: "active",
            questions: {
              $elemMatch: {
                _id: questionId,
                "voiceTranscription.claimId": claimId,
                "voiceTranscription.idempotencyKey": idempotencyKey,
                "voiceTranscription.status": "processing",
              },
            },
          },
          {
            $set: {
              "questions.$[question].voiceTranscription.completedAt":
                completedAt,
              "questions.$[question].voiceTranscription.text": text,
            },
          },
          {
            arrayFilters: [
              {
                "question._id": questionId,
                "question.voiceTranscription.claimId": claimId,
              },
            ],
            returnDocument: "after",
            runValidators: true,
          },
        );

        if (!stagedSession) {
          throw transcriptionConflict(
            "Interview changed while transcription was finishing. Please retry.",
          );
        }

        hasStagedTranscript = true;
        const completedSession = await finalizeStagedTranscription({
          claimId,
          idempotencyKey,
          interviewId,
          questionId,
          userId,
        });

        if (!completedSession) {
          throw transcriptionConflict(
            "Interview changed while transcription was finishing. Please retry.",
          );
        }

        return consumeCompletedTranscription({
          idempotencyKey,
          interviewId,
          questionId,
          text: completedSession.questions.id(questionId).voiceTranscription
            .text,
          userId,
        });
      } catch (error) {
        if (!hasStagedTranscript) {
          await releaseClaim({
            claimId,
            interviewId,
            questionId,
            userId,
          }).catch(() => undefined);
        }
        throw error;
      }
    },
  };
}
