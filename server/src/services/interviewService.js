import InterviewSession, {
  maxQuestionsPerInterview,
} from "../models/InterviewSession.js";
import { AppError } from "../utils/AppError.js";
import { getOwnedResourceFilter } from "../utils/getOwnedResourceFilter.js";

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

function resumeContextUnavailable() {
  return new AppError(
    "RESUME_CONTEXT_UNAVAILABLE",
    "Resume context is not available yet. Start without a resume.",
    { status: 422 },
  );
}

export function createInterviewService({ aiProviderService }) {
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

    async startInterview({ userId, interviewType, level, resumeId }) {
      if (resumeId) {
        throw resumeContextUnavailable();
      }

      const question = await aiProviderService.generateQuestion({
        interviewType,
        level,
        previousQuestions: [],
      });
      const startedAt = new Date();
      const session = await InterviewSession.create({
        interviewType,
        level,
        questions: [
          {
            generatedAt: startedAt,
            order: 1,
            prompt: question.prompt,
          },
        ],
        startedAt,
        status: "active",
        userId,
      });

      return {
        interview: toInterview(session),
        question: toQuestion(session.questions[0]),
      };
    },

    async generateNextQuestion({ interviewId, userId }) {
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

      if (session.questions.length >= maxQuestionsPerInterview) {
        throw new AppError(
          "QUESTION_LIMIT_REACHED",
          "This interview has reached its question limit.",
          { status: 409 },
        );
      }

      const question = await aiProviderService.generateQuestion({
        interviewType: session.interviewType,
        level: session.level,
        previousQuestions: session.questions.map(({ prompt }) => prompt),
      });
      const generatedAt = new Date();
      const expectedQuestionCount = session.questions.length;
      const updatedSession = await InterviewSession.findOneAndUpdate(
        {
          ...getOwnedResourceFilter(interviewId, userId),
          status: "active",
          questions: { $size: expectedQuestionCount },
        },
        {
          $push: {
            questions: {
              generatedAt,
              order: expectedQuestionCount + 1,
              prompt: question.prompt,
            },
          },
        },
        { returnDocument: "after", runValidators: true },
      );

      if (!updatedSession) {
        throw new AppError(
          "QUESTION_REQUEST_CONFLICT",
          "Interview changed. Please try again.",
          { status: 409 },
        );
      }

      return toQuestion(updatedSession.questions.at(-1));
    },

    async submitTextAnswer({ interviewId, questionId, text, userId }) {
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
                evaluationStatus: "pending",
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
        throw new AppError(
          "ANSWER_ALREADY_SUBMITTED",
          "An answer has already been submitted for this question.",
          { status: 409 },
        );
      }

      if (
        answer.evaluationStatus === "pending" &&
        question.answers.length > 0
      ) {
        throw new AppError(
          "EVALUATION_IN_PROGRESS",
          "Answer evaluation is already in progress. Please wait.",
          { status: 409 },
        );
      }

      if (question.answers.length > 0) {
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
                    evaluationStatus: "not_started",
                  },
                },
              },
            },
          },
          {
            $set: {
              "questions.$[question].answers.$[answer].evaluationStatus":
                "pending",
            },
          },
          {
            arrayFilters: [
              { "question._id": questionId },
              {
                "answer._id": answer.id,
                "answer.evaluationStatus": "not_started",
              },
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
      }

      let feedback;
      try {
        feedback = await aiProviderService.evaluateAnswer({
          answer: answer.text,
          interviewType: session.interviewType,
          level: session.level,
          question: question.prompt,
        });
      } catch (error) {
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
          },
          {
            arrayFilters: [
              { "question._id": questionId },
              { "answer._id": answer.id, "answer.evaluationStatus": "pending" },
            ],
          },
        );
        throw error;
      }

      const evaluatedAt = new Date();
      const evaluatedSession = await InterviewSession.findOneAndUpdate(
        {
          ...getOwnedResourceFilter(interviewId, userId),
          status: "active",
          questions: {
            $elemMatch: {
              _id: questionId,
              answers: {
                $elemMatch: { _id: answer.id, evaluationStatus: "pending" },
              },
            },
          },
        },
        {
          $set: {
            "questions.$[question].answers.$[answer].evaluationStatus":
              "completed",
            "questions.$[question].answers.$[answer].feedback": {
              ...feedback,
              evaluatedAt,
            },
          },
        },
        {
          arrayFilters: [
            { "question._id": questionId },
            { "answer._id": answer.id, "answer.evaluationStatus": "pending" },
          ],
          returnDocument: "after",
          runValidators: true,
        },
      );

      if (!evaluatedSession) {
        throw new AppError(
          "EVALUATION_SUBMISSION_CONFLICT",
          "Interview changed. Please try again.",
          { status: 409 },
        );
      }

      const evaluatedAnswer = evaluatedSession.questions
        .id(questionId)
        .answers.id(answer.id);
      return {
        answer: toAnswer(evaluatedAnswer),
        feedback: toFeedback(evaluatedAnswer.feedback),
      };
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

      const answers = session.questions.flatMap(
        ({ answers: questionAnswers }) => questionAnswers,
      );

      if (
        answers.some(({ evaluationStatus }) => evaluationStatus === "pending")
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
          status: "active",
          updatedAt: session.updatedAt,
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
