import { validateInterviewPlanQuery } from "../validators/interviewSchemas.js";

export function createInterviewPlanController({ interviewPlanService }) {
  return {
    async getPlan(request, response, next) {
      try {
        const input = validateInterviewPlanQuery(request.query);
        response.status(200).json(await interviewPlanService.getPlan({ ...input, userId: request.auth.userId }));
      } catch (error) {
        next(error);
      }
    },
  };
}
