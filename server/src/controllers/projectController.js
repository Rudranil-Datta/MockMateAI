import {
  validateExtractProjectsRequest,
  validateProjectId,
  validatePartialProjectWriteRequest,
  validateProjectWriteRequest,
} from "../validators/projectSchemas.js";

export function createProjectController({ projectService }) {
  return {
    async extractDrafts(request, response, next) {
      try {
        const input = validateExtractProjectsRequest(request.body);
        const drafts = await projectService.extractDrafts({
          ...input,
          userId: request.auth.userId,
        });
        response.status(200).json({ drafts });
      } catch (error) {
        next(error);
      }
    },

    async importReadme(request, response, next) {
      try {
        const result = await projectService.importReadmeDraft({
          file: request.file,
        });
        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    },

    async createProject(request, response, next) {
      try {
        const input = validateProjectWriteRequest(request.body);
        const project = await projectService.createProject({
          ...input,
          userId: request.auth.userId,
        });
        response.status(201).json({ project });
      } catch (error) {
        next(error);
      }
    },

    async createPartialProject(request, response, next) {
      try {
        const project = await projectService.createPartialProject({
          ...validatePartialProjectWriteRequest(request.body),
          userId: request.auth.userId,
        });
        response.status(201).json({ project });
      } catch (error) {
        next(error);
      }
    },

    async listProjects(request, response, next) {
      try {
        const items = await projectService.listProjects({
          userId: request.auth.userId,
        });
        response.status(200).json({ items });
      } catch (error) {
        next(error);
      }
    },

    async getProject(request, response, next) {
      try {
        const project = await projectService.getProject({
          projectId: validateProjectId(request.params.id),
          userId: request.auth.userId,
        });
        response.status(200).json({ project });
      } catch (error) {
        next(error);
      }
    },

    async updateProject(request, response, next) {
      try {
        const input = validateProjectWriteRequest(request.body);
        const project = await projectService.updateProject({
          ...input,
          projectId: validateProjectId(request.params.id),
          userId: request.auth.userId,
        });
        response.status(200).json({ project });
      } catch (error) {
        next(error);
      }
    },

    async updatePartialProject(request, response, next) {
      try {
        const project = await projectService.updatePartialProject({
          ...validatePartialProjectWriteRequest(request.body),
          projectId: validateProjectId(request.params.id),
          userId: request.auth.userId,
        });
        response.status(200).json({ project });
      } catch (error) {
        next(error);
      }
    },

    async deleteProject(request, response, next) {
      try {
        await projectService.deleteProject({
          projectId: validateProjectId(request.params.id),
          userId: request.auth.userId,
        });
        response.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  };
}
