import { createResumeService } from "../services/resumeService.js";

export function createResumeController({
  resumeService = createResumeService(),
} = {}) {
  return {
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
