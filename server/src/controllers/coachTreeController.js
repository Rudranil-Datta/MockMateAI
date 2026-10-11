import { validateCoachContextQuery } from "../validators/coachSchemas.js";

export function createCoachTreeController({ coachKnowledgeTreeService }) {
  return {
    async getTree(request, response, next) {
      try {
        const input = validateCoachContextQuery(request.query);
        response.status(200).json(
          await coachKnowledgeTreeService.getTree({
            ...input,
            userId: request.auth.userId,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  };
}
