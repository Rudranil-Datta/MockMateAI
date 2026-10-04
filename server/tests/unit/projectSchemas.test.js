import { describe, expect, it } from "vitest";

import {
  validateExtractProjectsRequest,
  validateProjectWriteRequest,
} from "../../src/validators/projectSchemas.js";

const facts = {
  architecture: ["React client with an Express API"],
  claims: [],
  decisions: [],
  name: "MockMateAI",
  responsibilities: ["Built and tested the interview workflow"],
  role: "Full-stack developer",
  summary: "An interview preparation application with structured feedback.",
  technologies: ["React", "Node.js"],
  tradeoffs: [],
};

describe("project request schemas", () => {
  it("accepts exact extraction and explicitly confirmed full writes", () => {
    expect(
      validateExtractProjectsRequest({
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
        resumeId: "507f1f77bcf86cd799439011",
      }),
    ).toMatchObject({ resumeId: "507f1f77bcf86cd799439011" });
    expect(validateProjectWriteRequest({ ...facts, confirmed: true })).toEqual(
      facts,
    );
  });

  it.each([
    { ...facts, confirmed: false },
    { ...facts, confirmed: true, extra: true },
    { ...facts, confirmed: true, technologies: ["React", "react"] },
    { ...facts, confirmed: true, summary: "short" },
  ])(
    "rejects unconfirmed, partial, duplicate, or unknown project input",
    (body) => {
      expect(() => validateProjectWriteRequest(body)).toThrow();
    },
  );

  it("uses the confirmation-specific safe error", () => {
    try {
      validateProjectWriteRequest({ ...facts, confirmed: false });
    } catch (error) {
      expect(error.code).toBe("PROJECT_CONFIRMATION_REQUIRED");
      expect(error.status).toBe(400);
    }
  });
});
