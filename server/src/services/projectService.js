import CandidateProject from "../models/CandidateProject.js";
import { AppError } from "../utils/AppError.js";
import { getOwnedResourceFilter } from "../utils/getOwnedResourceFilter.js";

const extractionCacheTtlMs = 60_000;
const maximumExtractionEntries = 100;

function notFound() {
  return new AppError("PROJECT_NOT_FOUND", "Project not found.", {
    status: 404,
  });
}

function idempotencyConflict() {
  return new AppError(
    "IDEMPOTENCY_KEY_REUSED",
    "Request identifier was already used with another resume.",
    { status: 409 },
  );
}

function extractionBusy() {
  return new AppError(
    "PROJECT_EXTRACTION_BUSY",
    "Project suggestions are busy. Please wait and try again.",
    { status: 409 },
  );
}

function iso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function toProject(project) {
  const value = project.toObject?.() ?? project;
  return {
    id: project.id || value._id?.toString(),
    name: value.name,
    summary: value.summary,
    role: value.role,
    technologies: value.technologies,
    responsibilities: value.responsibilities,
    architecture: value.architecture,
    decisions: value.decisions,
    tradeoffs: value.tradeoffs,
    claims: value.claims,
    ...(value.sourceResumeId
      ? { sourceResumeId: value.sourceResumeId.toString() }
      : {}),
    confirmedAt: iso(value.confirmedAt),
    createdAt: iso(value.createdAt),
    updatedAt: iso(value.updatedAt),
  };
}

function copyDrafts(drafts) {
  return structuredClone(drafts);
}

export function createProjectService({
  aiProviderService,
  candidateProjectModel = CandidateProject,
  now = Date.now,
  resumeService,
} = {}) {
  const extractionEntries = new Map();
  let sequence = 0;

  function purgeExpired() {
    for (const [key, entry] of extractionEntries) {
      if (!entry.promise && entry.expiresAt <= now())
        extractionEntries.delete(key);
    }
  }

  function makeRoom() {
    purgeExpired();
    if (extractionEntries.size < maximumExtractionEntries) return;
    const oldestCompleted = [...extractionEntries.entries()]
      .filter(([, entry]) => !entry.promise)
      .sort(([, left], [, right]) => left.sequence - right.sequence)[0];
    if (!oldestCompleted) throw extractionBusy();
    extractionEntries.delete(oldestCompleted[0]);
  }

  return {
    async extractDrafts({ idempotencyKey, resumeId, userId }) {
      purgeExpired();
      const key = `${userId}:${idempotencyKey}`;
      const existing = extractionEntries.get(key);
      if (existing) {
        if (existing.resumeId !== resumeId.toString())
          throw idempotencyConflict();
        const drafts = existing.promise
          ? await existing.promise
          : existing.drafts;
        return copyDrafts(drafts);
      }

      makeRoom();
      const entry = {
        expiresAt: now() + extractionCacheTtlMs,
        promise: null,
        resumeId: resumeId.toString(),
        sequence: sequence++,
      };
      const operation = (async () => {
        const resumeContext = await resumeService.getOwnedResumeProjectContext({
          resumeId,
          userId,
        });
        const { drafts } = await aiProviderService.extractProjectDrafts({
          resumeContext,
        });
        return drafts.map((draft) => ({
          ...draft,
          source: "resume_suggestion",
          sourceResumeId: resumeId.toString(),
        }));
      })();
      entry.promise = operation;
      extractionEntries.set(key, entry);

      try {
        const drafts = await operation;
        entry.drafts = copyDrafts(drafts);
        entry.expiresAt = now() + extractionCacheTtlMs;
        entry.promise = null;
        return copyDrafts(drafts);
      } catch (error) {
        if (extractionEntries.get(key) === entry) extractionEntries.delete(key);
        throw error;
      }
    },

    async createProject({ sourceResumeId, userId, ...facts }) {
      if (sourceResumeId) {
        await resumeService.assertOwnedCompletedResume({
          resumeId: sourceResumeId,
          userId,
        });
      }
      const project = await candidateProjectModel.create({
        ...facts,
        confirmedAt: new Date(now()),
        ...(sourceResumeId ? { sourceResumeId } : {}),
        userId,
      });
      return toProject(project);
    },

    async listProjects({ userId }) {
      const projects = await candidateProjectModel
        .find({ userId })
        .sort({ updatedAt: -1, _id: -1 })
        .limit(50);
      return projects.map(toProject);
    },

    async getProject({ projectId, userId }) {
      const project = await candidateProjectModel.findOne(
        getOwnedResourceFilter(projectId, userId),
      );
      if (!project) throw notFound();
      return toProject(project);
    },

    async updateProject({ projectId, sourceResumeId, userId, ...facts }) {
      if (sourceResumeId) {
        await resumeService.assertOwnedCompletedResume({
          resumeId: sourceResumeId,
          userId,
        });
      }
      const project = await candidateProjectModel.findOneAndUpdate(
        getOwnedResourceFilter(projectId, userId),
        {
          $set: {
            ...facts,
            confirmedAt: new Date(now()),
            ...(sourceResumeId ? { sourceResumeId } : {}),
          },
          ...(!sourceResumeId ? { $unset: { sourceResumeId: "" } } : {}),
        },
        { returnDocument: "after", runValidators: true },
      );
      if (!project) throw notFound();
      return toProject(project);
    },

    async deleteProject({ projectId, userId }) {
      const project = await candidateProjectModel.findOneAndDelete(
        getOwnedResourceFilter(projectId, userId),
      );
      if (!project) throw notFound();
    },
  };
}
