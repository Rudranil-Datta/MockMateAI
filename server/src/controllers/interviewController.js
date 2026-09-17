import {
  validateInterviewId,
  validateStartInterviewRequest,
  validateTextAnswerRequest,
} from "../validators/interviewSchemas.js";

export function createInterviewController({ interviewService }) {
  return {
    async getInterview(request, response, next) {
      try {
        const interview = await interviewService.getInterview({
          interviewId: validateInterviewId(request.params.id),
          userId: request.auth.userId,
        });

        response.status(200).json({ interview });
      } catch (error) {
        next(error);
      }
    },

    async startInterview(request, response, next) {
      try {
        const interviewInput = validateStartInterviewRequest(request.body);
        const result = await interviewService.startInterview({
          ...interviewInput,
          userId: request.auth.userId,
        });

        response.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },

    async generateNextQuestion(request, response, next) {
      try {
        const question = await interviewService.generateNextQuestion({
          interviewId: validateInterviewId(request.params.id),
          userId: request.auth.userId,
        });

        response.status(200).json({ question });
      } catch (error) {
        next(error);
      }
    },

    async submitTextAnswer(request, response, next) {
      try {
        const answerInput = validateTextAnswerRequest(request.body);
        const result = await interviewService.submitTextAnswer({
          ...answerInput,
          interviewId: validateInterviewId(request.params.id),
          userId: request.auth.userId,
        });

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    },

    async completeInterview(request, response, next) {
      try {
        const interview = await interviewService.completeInterview({
          interviewId: validateInterviewId(request.params.id),
          userId: request.auth.userId,
        });

        response.status(200).json({ interview });
      } catch (error) {
        next(error);
      }
    },
  };
}
