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
  };
}
