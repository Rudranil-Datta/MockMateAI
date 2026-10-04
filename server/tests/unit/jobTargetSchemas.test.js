import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import JobTarget from "../../src/models/JobTarget.js";
import {
  validateAnalyzeJobTargetRequest,
  validateCreateJobTargetRequest,
  validateJobTargetId,
  validatePatchJobTargetRequest,
} from "../../src/validators/jobTargetSchemas.js";

const key = "11111111-1111-4111-8111-111111111111";
const description =
  "Build secure Node.js APIs with MongoDB and strong testing practices. ".repeat(
    2,
  );

describe("Job Target request and model contracts", () => {
  it("normalizes exact create, patch, analyze, and ID inputs", () => {
    expect(
      validateCreateJobTargetRequest({
        company: " Example ",
        description,
        idempotencyKey: key,
        title: " Backend Engineer ",
      }),
    ).toMatchObject({ company: "Example", title: "Backend Engineer" });
    expect(
      validatePatchJobTargetRequest({ company: null, idempotencyKey: key }),
    ).toEqual({ company: null, idempotencyKey: key });
    expect(validateAnalyzeJobTargetRequest({ idempotencyKey: key })).toEqual({
      idempotencyKey: key,
    });
    const id = new mongoose.Types.ObjectId().toString();
    expect(validateJobTargetId(id)).toBe(id);
  });

  it.each([
    [{ description, idempotencyKey: key, title: "x" }],
    [{ description: "short", idempotencyKey: key, title: "Engineer" }],
    [{ description, extra: true, idempotencyKey: key, title: "Engineer" }],
    [{ description, idempotencyKey: "bad", title: "Engineer" }],
  ])("rejects invalid create input before side effects", (body) => {
    expect(() => validateCreateJobTargetRequest(body)).toThrowError(
      expect.objectContaining({ code: "VALIDATION_ERROR", status: 400 }),
    );
  });

  it("rejects empty patch, unexpected analyze fields, and invalid IDs", () => {
    expect(() =>
      validatePatchJobTargetRequest({ idempotencyKey: key }),
    ).toThrow();
    expect(() =>
      validateAnalyzeJobTargetRequest({ idempotencyKey: key, title: "No" }),
    ).toThrow();
    expect(() => validateJobTargetId("bad")).toThrowError(
      expect.objectContaining({ code: "VALIDATION_ERROR" }),
    );
  });

  it("enforces lifecycle state and declared indexes", async () => {
    const pending = new JobTarget({
      analysisRequestId: key,
      description,
      status: "analysis_pending",
      title: "Backend Engineer",
      userId: new mongoose.Types.ObjectId(),
    });
    await expect(pending.validate()).rejects.toThrow(
      "Pending analysis requires a claim and start time.",
    );

    const readyWithoutAnalysis = new JobTarget({
      analysisRequestId: key,
      description,
      status: "ready",
      title: "Backend Engineer",
      userId: new mongoose.Types.ObjectId(),
    });
    await expect(readyWithoutAnalysis.validate()).rejects.toThrow(
      "Only ready targets require analysis.",
    );

    expect(JobTarget.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ updatedAt: -1, userId: 1 }, expect.any(Object)],
        [{ status: 1, updatedAt: -1, userId: 1 }, expect.any(Object)],
        [
          { analysisRequestId: 1, userId: 1 },
          expect.objectContaining({ unique: true }),
        ],
      ]),
    );
  });
});
