import {
  validateAnalyzeJobTargetRequest,
  validateCreateJobTargetRequest,
  validateJobTargetId,
  validatePatchJobTargetRequest,
} from "../validators/jobTargetSchemas.js";

export function createJobTargetController({ jobTargetService }) {
  return {
    async createTarget(request, response, next) {
      try {
        const input = validateCreateJobTargetRequest(request.body);
        const target = await jobTargetService.createTarget({
          ...input,
          userId: request.auth.userId,
        });
        response.status(201).json({ target });
      } catch (error) {
        next(error);
      }
    },

    async listTargets(request, response, next) {
      try {
        const items = await jobTargetService.listTargets({
          userId: request.auth.userId,
        });
        response.status(200).json({ items });
      } catch (error) {
        next(error);
      }
    },

    async getTarget(request, response, next) {
      try {
        const target = await jobTargetService.getTarget({
          targetId: validateJobTargetId(request.params.id),
          userId: request.auth.userId,
        });
        response.status(200).json({ target });
      } catch (error) {
        next(error);
      }
    },

    async updateTarget(request, response, next) {
      try {
        const input = validatePatchJobTargetRequest(request.body);
        const target = await jobTargetService.updateTarget({
          ...input,
          targetId: validateJobTargetId(request.params.id),
          userId: request.auth.userId,
        });
        response.status(200).json({ target });
      } catch (error) {
        next(error);
      }
    },

    async analyzeTarget(request, response, next) {
      try {
        const input = validateAnalyzeJobTargetRequest(request.body);
        const target = await jobTargetService.analyzeTarget({
          ...input,
          targetId: validateJobTargetId(request.params.id),
          userId: request.auth.userId,
        });
        response.status(200).json({ target });
      } catch (error) {
        next(error);
      }
    },

    async deleteTarget(request, response, next) {
      try {
        await jobTargetService.deleteTarget({
          targetId: validateJobTargetId(request.params.id),
          userId: request.auth.userId,
        });
        response.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  };
}
