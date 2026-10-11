import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import CandidateProject from "../../src/models/CandidateProject.js";

function validProject(overrides = {}) {
  return {
    architecture: ["React client with an Express API"],
    claims: [{ evidence: null, text: "Reduced repeated manual work" }],
    confirmedAt: new Date(),
    decisions: [],
    name: "MockMateAI",
    responsibilities: ["Built and tested the interview workflow"],
    role: "Full-stack developer",
    summary:
      "An interview preparation application with structured practice feedback.",
    technologies: ["React", "Node.js"],
    tradeoffs: [],
    userId: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

describe("CandidateProject", () => {
  it("validates confirmed bounded facts and declares owned indexes", async () => {
    await expect(
      new CandidateProject(validProject()).validate(),
    ).resolves.toBeUndefined();
    expect(CandidateProject.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ updatedAt: -1, userId: 1 }, {}],
        [{ confirmedAt: -1, userId: 1 }, {}],
      ]),
    );
  });

  it("rejects missing confirmation, duplicate facts, and oversized facts", async () => {
    await expect(
      new CandidateProject(validProject({ confirmedAt: undefined })).validate(),
    ).rejects.toThrow();
    await expect(
      new CandidateProject(
        validProject({ technologies: ["React", "react"] }),
      ).validate(),
    ).rejects.toThrow();
    await expect(
      new CandidateProject(
        validProject({
          architecture: Array.from(
            { length: 10 },
            (_, index) => `${index}-${"😀".repeat(149)}`,
          ),
          decisions: Array.from(
            { length: 8 },
            (_, index) => `${index}-${"😀".repeat(149)}`,
          ),
          responsibilities: Array.from(
            { length: 10 },
            (_, index) => `${index}-${"😀".repeat(149)}`,
          ),
          tradeoffs: Array.from(
            { length: 8 },
            (_, index) => `${index}-${"😀".repeat(149)}`,
          ),
        }),
      ).validate(),
    ).rejects.toThrow();
  });

  it("allows confirmed partial projects without ready confirmation", async () => {
    await expect(
      new CandidateProject(
        validProject({
          confirmedAt: undefined,
          partialConfirmedAt: new Date(),
          status: "partial",
        }),
      ).validate(),
    ).resolves.toBeUndefined();
  });
});
