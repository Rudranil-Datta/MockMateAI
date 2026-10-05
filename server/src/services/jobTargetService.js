import { randomUUID } from "node:crypto";

import JobTarget from "../models/JobTarget.js";
import { AppError } from "../utils/AppError.js";
import { getOwnedResourceFilter } from "../utils/getOwnedResourceFilter.js";

const analysisLeaseMs = 30_000;

function notFound() {
  return new AppError("JOB_TARGET_NOT_FOUND", "Job Target not found.", {
    status: 404,
  });
}

function inProgress() {
  return new AppError(
    "JOB_TARGET_ANALYSIS_IN_PROGRESS",
    "Job Target analysis is already in progress. Please wait.",
    { status: 409 },
  );
}

function notReady() {
  return new AppError(
    "JOB_TARGET_NOT_READY",
    "Job Target is not ready for Role Simulation.",
    { status: 409 },
  );
}

function idempotencyConflict() {
  return new AppError(
    "IDEMPOTENCY_KEY_REUSED",
    "Request identifier was already used for different Job Target settings.",
    { status: 409 },
  );
}

function toTarget(target) {
  return {
    id: target.id,
    title: target.title,
    ...(target.company ? { company: target.company } : {}),
    description: target.description,
    status: target.status,
    ...(target.analysis
      ? { analysis: target.analysis.toObject?.() ?? target.analysis }
      : {}),
    ...(target.analysisFailureCode
      ? { analysisFailureCode: target.analysisFailureCode }
      : {}),
    createdAt: target.createdAt.toISOString(),
    updatedAt: target.updatedAt.toISOString(),
  };
}

function sameInput(target, input) {
  return (
    target.title === input.title &&
    (target.company || undefined) === (input.company || undefined) &&
    target.description === input.description
  );
}

function failureCode(error) {
  if (error?.code === "INVALID_AI_RESPONSE") return "invalid_response";
  if (error?.code === "AI_QUOTA_EXCEEDED") return "quota";
  if (error?.code === "AI_PROVIDER_TIMEOUT") return "timeout";
  return "unavailable";
}

function replayFailedAnalysis(target) {
  const definitions = {
    invalid_response: [
      "INVALID_AI_RESPONSE",
      "AI practice returned an unusable response. Please try again.",
      502,
    ],
    quota: [
      "AI_QUOTA_EXCEEDED",
      "AI practice is temporarily unavailable. Your saved work is safe; try again later.",
      429,
    ],
    timeout: [
      "AI_PROVIDER_TIMEOUT",
      "AI practice is taking longer than expected. Please try again.",
      504,
    ],
    unavailable: [
      "AI_PROVIDER_UNAVAILABLE",
      "AI practice is temporarily unavailable. Please try again.",
      502,
    ],
  };
  const [code, message, status] = definitions[target.analysisFailureCode];
  return new AppError(code, message, { expose: true, status });
}

export function createJobTargetService({
  aiProviderService,
  jobTargetModel = JobTarget,
  now = Date.now,
}) {
  async function finishAnalysis(target, claimId) {
    let analysis;
    try {
      analysis = await aiProviderService.analyzeJobTarget({
        company: target.company || undefined,
        description: target.description,
        title: target.title,
      });
    } catch (error) {
      await jobTargetModel.findOneAndUpdate(
        {
          ...getOwnedResourceFilter(target.id, target.userId),
          analysisClaimId: claimId,
          status: "analysis_pending",
        },
        {
          $set: {
            analysisFailureCode: failureCode(error),
            status: "analysis_failed",
          },
          $unset: {
            analysis: "",
            analysisClaimId: "",
            analysisStartedAt: "",
          },
        },
        { runValidators: true },
      );
      throw error;
    }

    const ready = await jobTargetModel.findOneAndUpdate(
      {
        ...getOwnedResourceFilter(target.id, target.userId),
        analysisClaimId: claimId,
        status: "analysis_pending",
      },
      {
        $set: { analysis, status: "ready" },
        $unset: {
          analysisClaimId: "",
          analysisFailureCode: "",
          analysisStartedAt: "",
        },
      },
      { returnDocument: "after", runValidators: true },
    );
    if (!ready) throw inProgress();
    return toTarget(ready);
  }

  function staleBefore() {
    return new Date(now() - analysisLeaseMs);
  }

  return {
    async getReadyTargetSnapshot({ targetId, userId }) {
      const target = await jobTargetModel.findOne(
        getOwnedResourceFilter(targetId, userId),
      );
      if (!target) throw notFound();
      if (target.status !== "ready" || !target.analysis) throw notReady();

      return {
        analysis: target.analysis.toObject?.() ?? target.analysis,
        displayLabel: target.company
          ? `${target.title} at ${target.company}`
          : target.title,
        kind: "job_target",
        sourceId: target.id,
        sourceUpdatedAt: target.updatedAt,
      };
    },

    async createTarget({
      company,
      description,
      idempotencyKey,
      title,
      userId,
    }) {
      let target = await jobTargetModel.findOne({
        analysisRequestId: idempotencyKey,
        userId,
      });

      if (target) {
        if (!sameInput(target, { company, description, title })) {
          throw idempotencyConflict();
        }
        if (target.status === "ready") return toTarget(target);
        if (target.status === "analysis_failed")
          throw replayFailedAnalysis(target);
        if (target.analysisStartedAt > staleBefore()) throw inProgress();
      }

      const claimId = randomUUID();
      const analysisStartedAt = new Date(now());
      if (!target) {
        try {
          target = await jobTargetModel.create({
            analysisClaimId: claimId,
            analysisRequestId: idempotencyKey,
            analysisStartedAt,
            ...(company ? { company } : {}),
            description,
            status: "analysis_pending",
            title,
            userId,
          });
        } catch (error) {
          if (error?.code !== 11000) throw error;
          target = await jobTargetModel.findOne({
            analysisRequestId: idempotencyKey,
            userId,
          });
          if (!target || !sameInput(target, { company, description, title })) {
            throw idempotencyConflict();
          }
          if (target.status === "ready") return toTarget(target);
          throw inProgress();
        }
      } else {
        target = await jobTargetModel.findOneAndUpdate(
          {
            ...getOwnedResourceFilter(target.id, userId),
            analysisRequestId: idempotencyKey,
            analysisStartedAt: { $lte: staleBefore() },
            status: "analysis_pending",
          },
          { $set: { analysisClaimId: claimId, analysisStartedAt } },
          { returnDocument: "after", runValidators: true },
        );
        if (!target) throw inProgress();
      }

      return finishAnalysis(target, claimId);
    },

    async listTargets({ userId }) {
      const targets = await jobTargetModel
        .find({ userId })
        .sort({ updatedAt: -1, _id: -1 })
        .limit(50);
      return targets.map(toTarget);
    },

    async getTarget({ targetId, userId }) {
      const target = await jobTargetModel.findOne(
        getOwnedResourceFilter(targetId, userId),
      );
      if (!target) throw notFound();
      return toTarget(target);
    },

    async updateTarget({ idempotencyKey, targetId, userId, ...changes }) {
      const current = await jobTargetModel.findOne(
        getOwnedResourceFilter(targetId, userId),
      );
      if (!current) throw notFound();

      const input = {
        company:
          changes.company === null
            ? undefined
            : changes.company === undefined
              ? current.company || undefined
              : changes.company,
        description: changes.description ?? current.description,
        title: changes.title ?? current.title,
      };
      if (current.analysisRequestId === idempotencyKey) {
        if (!sameInput(current, input)) throw idempotencyConflict();
        if (current.status === "ready") return toTarget(current);
        if (current.status === "analysis_failed")
          throw replayFailedAnalysis(current);
        throw inProgress();
      }
      if (
        current.status === "analysis_pending" &&
        current.analysisStartedAt > staleBefore()
      ) {
        throw inProgress();
      }

      const claimId = randomUUID();
      const analysisStartedAt = new Date(now());
      const target = await jobTargetModel.findOneAndUpdate(
        {
          ...getOwnedResourceFilter(targetId, userId),
          $or: [
            { status: { $in: ["ready", "analysis_failed"] } },
            {
              analysisStartedAt: { $lte: staleBefore() },
              status: "analysis_pending",
            },
          ],
        },
        {
          $set: {
            analysisClaimId: claimId,
            analysisRequestId: idempotencyKey,
            analysisStartedAt,
            ...(input.company ? { company: input.company } : {}),
            description: input.description,
            status: "analysis_pending",
            title: input.title,
          },
          $unset: {
            analysis: "",
            analysisFailureCode: "",
            ...(!input.company ? { company: "" } : {}),
          },
        },
        { returnDocument: "after", runValidators: true },
      );
      if (!target) throw inProgress();
      return finishAnalysis(target, claimId);
    },

    async analyzeTarget({ idempotencyKey, targetId, userId }) {
      const current = await jobTargetModel.findOne(
        getOwnedResourceFilter(targetId, userId),
      );
      if (!current) throw notFound();
      if (current.analysisRequestId === idempotencyKey) {
        if (current.status === "ready") return toTarget(current);
        if (current.status === "analysis_failed")
          throw replayFailedAnalysis(current);
        throw inProgress();
      }
      if (
        current.status === "ready" ||
        (current.status === "analysis_pending" &&
          current.analysisStartedAt > staleBefore())
      ) {
        throw new AppError(
          "JOB_TARGET_NOT_READY",
          "Job Target cannot be analyzed in its current state.",
          { status: 409 },
        );
      }

      const claimId = randomUUID();
      const analysisStartedAt = new Date(now());
      const target = await jobTargetModel.findOneAndUpdate(
        {
          ...getOwnedResourceFilter(targetId, userId),
          $or: [
            { status: "analysis_failed" },
            {
              analysisStartedAt: { $lte: staleBefore() },
              status: "analysis_pending",
            },
          ],
        },
        {
          $set: {
            analysisClaimId: claimId,
            analysisRequestId: idempotencyKey,
            analysisStartedAt,
            status: "analysis_pending",
          },
          $unset: { analysis: "", analysisFailureCode: "" },
        },
        { returnDocument: "after", runValidators: true },
      );
      if (!target) throw inProgress();
      return finishAnalysis(target, claimId);
    },

    async deleteTarget({ targetId, userId }) {
      const target = await jobTargetModel.findOneAndDelete(
        getOwnedResourceFilter(targetId, userId),
      );
      if (!target) throw notFound();
    },
  };
}
