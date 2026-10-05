import { describe, expect, it } from "vitest";

import { deriveProjectChallengeDirective } from "../../src/services/projectDefenseChallengeService.js";

const facts = {
  architecture: ["Modular monolith with bounded API modules."],
  claims: [{ evidence: "Load tests", text: "Reduced latency by 20%." }],
  decisions: ["Used idempotency keys for retries."],
  responsibilities: ["Owned payment API reliability."],
  technologies: ["Node.js"],
  tradeoffs: ["Favored consistency over write throughput."],
};

describe("projectDefenseChallengeService", () => {
  it.each([
    ["architecture", 1, "architecture"],
    ["architecture", 2, "data"],
    ["architecture", 3, "security"],
    ["architecture", 4, "deployment"],
    ["architecture", 5, "failure-scenario"],
    ["technology-choices", 1, "technology"],
    ["technology-choices", 2, "testing"],
    ["technology-choices", 4, "trade-off"],
  ])("maps %s challenge %i to %s", (topicKey, count, axis) => {
    expect(
      deriveProjectChallengeDirective({
        facts,
        latestAnswer: "I would validate the behavior with focused tests.",
        latestTopicKey: topicKey,
        previousQuestionCount: count,
      }),
    ).toMatchObject({ axis });
  });

  it("prefers an explicit claim for claimed-results and falls back to topic facts", () => {
    expect(
      deriveProjectChallengeDirective({
        facts,
        latestAnswer: "The result came from controlled load tests.",
        latestTopicKey: "claimed-results",
        previousQuestionCount: 1,
      }),
    ).toEqual({
      anchorKey: "claims:0",
      anchorText: "Reduced latency by 20%.",
      axis: "testing",
      latestAnswer: "The result came from controlled load tests.",
    });

    expect(
      deriveProjectChallengeDirective({
        facts: { ...facts, claims: [] },
        latestAnswer: "I selected clear module boundaries.",
        latestTopicKey: "architecture",
        previousQuestionCount: 1,
      }),
    ).toMatchObject({
      anchorKey: "architecture:0",
      anchorText: facts.architecture[0],
    });
  });
});
