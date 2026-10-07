import { validateCoachRoadmapQuery } from "../validators/coachSchemas.js";

export function createCoachController({ coachRoadmapService }) {
  return {
    async getRoadmap(request, response, next) {
      try {
        const input = validateCoachRoadmapQuery(request.query);
        const roadmap = await coachRoadmapService.getRoadmap({
          ...input,
          userId: request.auth.userId,
        });
        response.status(200).json(roadmap);
      } catch (error) {
        next(error);
      }
    },
  };
}
