const mockQuestionSets = {
  DSA: {
    advanced: [
      "Design an algorithm to find the median of two sorted arrays. Explain its time complexity.",
      "How would you detect and remove a cycle in a linked list with constant extra space?",
    ],
    beginner: [
      "Explain the difference between an array and a linked list. When would you choose each?",
      "Write an approach to check whether a string is a palindrome.",
    ],
    intermediate: [
      "Explain how a hash map handles collisions and when lookup performance can degrade.",
      "How would you find the first non-repeating character in a string?",
    ],
  },
  HR: {
    advanced: [
      "Tell me about a difficult stakeholder conflict you resolved and how you measured the outcome.",
      "Describe a time you changed team direction after receiving new evidence.",
    ],
    beginner: [
      "Tell me about yourself and why you want this role.",
      "Describe a time you learned a new skill to complete a task.",
    ],
    intermediate: [
      "Describe a time you received critical feedback. What did you do next?",
      "Tell me about a project where priorities changed. How did you respond?",
    ],
  },
  "System Design": {
    advanced: [
      "Design a globally distributed notification service. Explain consistency, delivery guarantees, and failure handling.",
      "Design a multi-tenant analytics platform that supports near-real-time dashboards.",
    ],
    beginner: [
      "Design a URL shortener. What components and data would it need?",
      "Design a basic appointment-booking system for a small clinic.",
    ],
    intermediate: [
      "Design a rate-limited file upload service. Explain storage, validation, and scaling choices.",
      "Design a chat application that supports online status and message history.",
    ],
  },
};

function leastUsedDifferentCoverage(coveragePlan, previousQuestions, topicKey) {
  const counts = new Map(coveragePlan.map((item) => [item.topicKey, 0]));
  for (const question of previousQuestions) {
    counts.set(question.topicKey, (counts.get(question.topicKey) || 0) + 1);
  }
  return coveragePlan
    .filter((item) => item.topicKey !== topicKey)
    .sort(
      (left, right) => counts.get(left.topicKey) - counts.get(right.topicKey),
    )[0];
}

function mockAdaptiveDecision(coveragePlan, level, previousQuestions) {
  if (previousQuestions.length === 0) {
    return {
      coverage: coveragePlan[0],
      decisionType: "baseline",
      difficulty: level,
      parentQuestionOrder: null,
      reasonCode: "opening",
    };
  }

  const latest = previousQuestions.at(-1);
  const preceding = previousQuestions.at(-2);
  const mustSwitch =
    ["clarify", "recover"].includes(latest.decisionType) ||
    (preceding && preceding.topicKey === latest.topicKey);
  if (mustSwitch) {
    return {
      coverage: leastUsedDifferentCoverage(
        coveragePlan,
        previousQuestions,
        latest.topicKey,
      ),
      decisionType: "switch_topic",
      difficulty: latest.difficulty,
      parentQuestionOrder: null,
      reasonCode: "coverage_gap",
    };
  }

  const branch = {
    missing: ["recover", "missing_evidence"],
    partial: ["clarify", "partial_evidence"],
    strong: ["deepen", "strong_evidence"],
    weak: ["recover", "weak_evidence"],
  }[latest.outcome];
  return {
    coverage: coveragePlan.find(({ topicKey }) => topicKey === latest.topicKey),
    decisionType: branch[0],
    difficulty: latest.difficulty,
    parentQuestionOrder: latest.order,
    reasonCode: branch[1],
  };
}

export function createMockAiProvider() {
  return {
    async generateAdaptiveQuestion({
      challengeDirective,
      coveragePlan,
      level,
      previousQuestions,
    }) {
      const decision = mockAdaptiveDecision(
        coveragePlan,
        level,
        previousQuestions,
      );
      const { coverage } = decision;
      return {
        ...(challengeDirective
          ? {
              challengeAnchorKey: challengeDirective.anchorKey,
              challengeAxis: challengeDirective.axis,
            }
          : {}),
        decisionType: decision.decisionType,
        difficulty: decision.difficulty,
        parentQuestionOrder: decision.parentQuestionOrder,
        prompt: challengeDirective
          ? `Challenge "${challengeDirective.anchorText}": explain ${coverage.label} at a ${level} level.`
          : `Explain ${coverage.label} at a ${level} level.`,
        reasonCode: decision.reasonCode,
        testedSkillKeys: coverage.skillKeys.slice(0, 3),
        topicKey: coverage.topicKey,
      };
    },

    async analyzeJobTarget({ title }) {
      return {
        requirements: [
          {
            evidenceTerms: ["practical examples"],
            key: "role-fundamentals",
            label: "Role fundamentals",
            priority: "required",
          },
        ],
        roleSummary: `Prepare for ${title} responsibilities using clear, evidence-based explanations.`,
        skills: [
          {
            key: "role-fundamentals",
            label: "Role fundamentals",
            sourceRequirementKeys: ["role-fundamentals"],
            weight: 5,
          },
        ],
      };
    },

    async extractProjectDrafts() {
      return {
        drafts: [
          {
            architecture: ["Client, API, and database layers"],
            claims: [],
            decisions: ["Separated presentation and API responsibilities"],
            name: "Resume project",
            responsibilities: [
              "Implemented and tested the documented project features",
            ],
            role: "Project contributor",
            summary:
              "A resume-derived project suggestion that must be reviewed and corrected before saving.",
            technologies: ["JavaScript"],
            tradeoffs: [],
          },
        ],
      };
    },

    async generateQuestion({ interviewType, level, previousQuestions }) {
      const questions = mockQuestionSets[interviewType][level];
      const prompt = questions[previousQuestions.length % questions.length];

      return { prompt };
    },

    async evaluateAnswer() {
      return {
        accuracyScore: 78,
        clarityScore: 76,
        confidenceScore: 74,
        improvements: ["Add one concrete example to support your explanation."],
        nextStep: "Practise giving a concise answer with a concrete example.",
        overallScore: 76,
        strengths: ["Explains the core idea clearly."],
      };
    },
  };
}
