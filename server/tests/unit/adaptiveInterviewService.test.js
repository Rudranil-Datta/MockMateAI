import { describe, expect, it, vi } from "vitest";

import {
  createAdaptiveInterviewService,
  normalizedPromptSimilarity,
} from "../../src/services/adaptiveInterviewService.js";
import { deriveAdaptiveOutcome } from "../../src/validators/adaptiveInterviewSchemas.js";

const coveragePlan = [
  {
    label: "API design",
    skillKeys: ["api-design"],
    topicKey: "api-design",
  },
  {
    label: "Data modeling",
    skillKeys: ["mongodb"],
    topicKey: "data-modeling",
  },
  {
    label: "Testing",
    skillKeys: ["integration-testing"],
    topicKey: "testing",
  },
];

function input(overrides = {}) {
  return {
    challengeDirective: null,
    contextSummary: null,
    coveragePlan,
    focusSkillKey: null,
    interviewType: "Role Simulation",
    level: "intermediate",
    previousQuestions: [],
    sessionPurpose: "standard",
    ...overrides,
  };
}

function previousQuestion(overrides = {}) {
  return {
    decisionType: "baseline",
    difficulty: "intermediate",
    order: 1,
    overallScore: 85,
    parentQuestionOrder: null,
    prompt: "Design a reliable API for interview scheduling.",
    reasonCode: "opening",
    testedSkillKeys: ["api-design"],
    topicKey: "api-design",
    ...overrides,
  };
}

function decision(overrides = {}) {
  return {
    decisionType: "baseline",
    difficulty: "intermediate",
    parentQuestionOrder: null,
    prompt: "How would you design request validation for this API?",
    reasonCode: "opening",
    testedSkillKeys: ["api-design"],
    topicKey: "api-design",
    ...overrides,
  };
}

function createService(output) {
  const aiProviderService = {
    generateAdaptiveQuestion: vi.fn().mockResolvedValue(output),
  };
  return {
    aiProviderService,
    service: createAdaptiveInterviewService({ aiProviderService }),
  };
}

describe("adaptiveInterviewService", () => {
  it.each([
    [0, "missing"],
    [1, "weak"],
    [59, "weak"],
    [60, "partial"],
    [84, "partial"],
    [85, "strong"],
    [100, "strong"],
  ])("derives score %i as %s", (score, outcome) => {
    expect(deriveAdaptiveOutcome(score)).toBe(outcome);
  });

  it.each([
    {
      expected: decision(),
      request: input(),
    },
    {
      expected: decision({
        testedSkillKeys: ["integration-testing"],
        topicKey: "testing",
      }),
      request: input({ interviewType: "DSA" }),
    },
    {
      expected: decision({
        decisionType: "retest",
        reasonCode: "targeted_retest",
        testedSkillKeys: ["mongodb"],
        topicKey: "data-modeling",
      }),
      request: input({
        focusSkillKey: "mongodb",
        sessionPurpose: "targeted_practice",
      }),
    },
  ])("accepts one legal opening", async ({ expected, request }) => {
    const { aiProviderService, service } = createService(expected);

    await expect(service.generateNextQuestion(request)).resolves.toEqual(
      expected,
    );
    expect(aiProviderService.generateAdaptiveQuestion).toHaveBeenCalledOnce();
  });

  it.each([
    {
      expected: decision({
        decisionType: "deepen",
        difficulty: "advanced",
        parentQuestionOrder: 1,
        reasonCode: "strong_evidence",
      }),
      score: 85,
    },
    {
      expected: decision({
        decisionType: "clarify",
        parentQuestionOrder: 1,
        reasonCode: "partial_evidence",
      }),
      score: 60,
    },
    {
      expected: decision({
        decisionType: "recover",
        difficulty: "beginner",
        parentQuestionOrder: 1,
        reasonCode: "weak_evidence",
      }),
      score: 1,
    },
    {
      expected: decision({
        decisionType: "recover",
        parentQuestionOrder: 1,
        reasonCode: "missing_evidence",
      }),
      score: 0,
    },
  ])(
    "enforces answer-aware branch for score $score",
    async ({ expected, score }) => {
      const { aiProviderService, service } = createService(expected);

      await expect(
        service.generateNextQuestion(
          input({
            previousQuestions: [previousQuestion({ overallScore: score })],
          }),
        ),
      ).resolves.toEqual(expected);
      expect(
        aiProviderService.generateAdaptiveQuestion.mock.calls[0][0]
          .previousQuestions[0].outcome,
      ).toBe(deriveAdaptiveOutcome(score));
    },
  );

  it("switches to least-used different topic after two same-topic questions", async () => {
    const expected = decision({
      decisionType: "switch_topic",
      parentQuestionOrder: null,
      prompt: "Model interview scheduling data for safe concurrent updates.",
      reasonCode: "coverage_gap",
      testedSkillKeys: ["mongodb"],
      topicKey: "data-modeling",
    });
    const { service } = createService(expected);
    const history = [
      previousQuestion(),
      previousQuestion({
        decisionType: "deepen",
        order: 2,
        parentQuestionOrder: 1,
        prompt: "How would you make that API resilient under load?",
        reasonCode: "strong_evidence",
      }),
    ];

    await expect(
      service.generateNextQuestion(input({ previousQuestions: history })),
    ).resolves.toEqual(expected);
  });

  it("stops a required switch when no different topic exists", async () => {
    const { aiProviderService, service } = createService(decision());
    const singleTopic = [coveragePlan[0]];
    const history = [
      previousQuestion(),
      previousQuestion({
        decisionType: "clarify",
        order: 2,
        overallScore: 60,
        parentQuestionOrder: 1,
        prompt: "Clarify your API validation strategy.",
        reasonCode: "partial_evidence",
      }),
    ];

    await expect(
      service.generateNextQuestion(
        input({ coveragePlan: singleTopic, previousQuestions: history }),
      ),
    ).rejects.toMatchObject({
      code: "ADAPTIVE_SEQUENCE_COMPLETE",
      status: 409,
    });
    expect(aiProviderService.generateAdaptiveQuestion).not.toHaveBeenCalled();
  });

  it("stops before a sixth question without provider work", async () => {
    const { aiProviderService, service } = createService(decision());
    const history = Array.from({ length: 5 }, (_, index) =>
      previousQuestion({
        order: index + 1,
        prompt: `Distinct interview prompt number ${index + 1}.`,
        topicKey: coveragePlan[index % coveragePlan.length].topicKey,
        testedSkillKeys: coveragePlan[index % coveragePlan.length].skillKeys,
      }),
    );

    await expect(
      service.generateNextQuestion(input({ previousQuestions: history })),
    ).rejects.toMatchObject({ code: "QUESTION_LIMIT_REACHED", status: 409 });
    expect(aiProviderService.generateAdaptiveQuestion).not.toHaveBeenCalled();
  });

  it.each([
    decision({ decisionType: "clarify", reasonCode: "partial_evidence" }),
    decision({ difficulty: "beginner" }),
    decision({ parentQuestionOrder: 1 }),
    decision({ testedSkillKeys: ["mongodb"] }),
  ])(
    "rejects provider decisions that violate deterministic rules",
    async (output) => {
      const { aiProviderService, service } = createService(output);

      await expect(service.generateNextQuestion(input())).rejects.toMatchObject(
        {
          code: "INVALID_AI_RESPONSE",
          status: 502,
        },
      );
      expect(aiProviderService.generateAdaptiveQuestion).toHaveBeenCalledOnce();
    },
  );

  it("rejects normalized prompt repetition at the approved threshold", async () => {
    expect(normalizedPromptSimilarity("ABCDEFGHIJ", "abcdefghxj")).toBe(0.9);
    expect(normalizedPromptSimilarity("ABCDEFGHIJ", "abcdezzhij")).toBe(0.8);

    const repeated = decision({
      decisionType: "deepen",
      parentQuestionOrder: 1,
      prompt: "DESIGN a reliable API for interview scheduling!",
      reasonCode: "strong_evidence",
    });
    const { service } = createService(repeated);

    await expect(
      service.generateNextQuestion(
        input({ previousQuestions: [previousQuestion()] }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_AI_RESPONSE", status: 502 });
  });

  it("accepts only a grounded Project Defense follow-up challenge", async () => {
    const challengeDirective = {
      anchorKey: "architecture:0",
      anchorText: "Modular monolith with bounded API modules.",
      axis: "security",
      latestAnswer: "I isolated payment and identity responsibilities.",
    };
    const expected = decision({
      challengeAnchorKey: challengeDirective.anchorKey,
      challengeAxis: challengeDirective.axis,
      decisionType: "deepen",
      difficulty: "advanced",
      parentQuestionOrder: 1,
      prompt:
        'Given "Modular monolith with bounded API modules.", how would you secure module boundaries?',
      reasonCode: "strong_evidence",
    });
    const { service } = createService(expected);

    await expect(
      service.generateNextQuestion(
        input({
          challengeDirective,
          interviewType: "Project Defense",
          previousQuestions: [previousQuestion()],
        }),
      ),
    ).resolves.toEqual(expected);

    for (const invalid of [
      { ...expected, challengeAxis: "testing" },
      { ...expected, challengeAnchorKey: "architecture:1" },
      { ...expected, prompt: "Give more security detail." },
    ]) {
      const invalidService = createService(invalid).service;
      await expect(
        invalidService.generateNextQuestion(
          input({
            challengeDirective,
            interviewType: "Project Defense",
            previousQuestions: [previousQuestion()],
          }),
        ),
      ).rejects.toMatchObject({ code: "INVALID_AI_RESPONSE", status: 502 });
    }
  });

  it("validates input before work and propagates one provider failure", async () => {
    const providerError = Object.assign(new Error("quota"), {
      code: "AI_QUOTA_EXCEEDED",
      status: 429,
    });
    const aiProviderService = {
      generateAdaptiveQuestion: vi.fn().mockRejectedValue(providerError),
    };
    const service = createAdaptiveInterviewService({ aiProviderService });

    await expect(
      service.generateNextQuestion(input({ extra: true })),
    ).rejects.toMatchObject({ code: "INVALID_AI_REQUEST", status: 400 });
    await expect(service.generateNextQuestion(input())).rejects.toBe(
      providerError,
    );
    expect(aiProviderService.generateAdaptiveQuestion).toHaveBeenCalledOnce();
  });
});
