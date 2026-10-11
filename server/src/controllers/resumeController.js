import { createResumeService } from "../services/resumeService.js";

export function createResumeController({
  resumeService = createResumeService(),
} = {}) {
  return {
    async listResumes(request, response, next) {
      try {
        const resumes = await resumeService.listOwnedResumes({
          userId: request.auth.userId,
        });

        response.status(200).json({ resumes });
      } catch (error) {
        next(error);
      }
    },

    async createResume(request, response, next) {
      try {
        const resume = await resumeService.createResume({
          file: request.file,
          userId: request.auth.userId,
        });

        response.status(201).json({ resume });
      } catch (error) {
        next(error);
      }
    },

    async deleteResume(request, response, next) {
      try {
        await resumeService.deleteOwnedResume({
          resumeId: request.params.resumeId,
          userId: request.auth.userId,
        });

        response.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  };
}
