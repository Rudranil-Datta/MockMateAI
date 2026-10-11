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

const mockJobTargetProfiles = [
  {
    matchTerms: [
      "node.js",
      "nodejs",
      "express",
      "api",
      "backend",
      "mongodb",
      "database",
    ],
    requirements: [
      {
        key: "backend-api-design",
        label: "Backend API design",
        priority: "required",
      },
      {
        key: "data-reliability",
        label: "Data reliability",
        priority: "required",
      },
    ],
    skills: [
      {
        key: "node-js",
        label: "Node.js",
        sourceRequirementKeys: ["backend-api-design"],
        weight: 5,
      },
      {
        key: "database-design",
        label: "Database design",
        sourceRequirementKeys: ["data-reliability"],
        weight: 4,
      },
    ],
    summary: "backend and API terms",
  },
  {
    matchTerms: [
      "react",
      "frontend",
      "front-end",
      "accessibility",
      "css",
      "typescript",
      "ui",
    ],
    requirements: [
      {
        key: "user-interface-engineering",
        label: "User interface engineering",
        priority: "required",
      },
      {
        key: "accessible-interactions",
        label: "Accessible interactions",
        priority: "preferred",
      },
    ],
    skills: [
      {
        key: "react",
        label: "React",
        sourceRequirementKeys: ["user-interface-engineering"],
        weight: 5,
      },
      {
        key: "accessibility",
        label: "Accessibility",
        sourceRequirementKeys: ["accessible-interactions"],
        weight: 4,
      },
    ],
    summary: "frontend and interaction terms",
  },
  {
    matchTerms: [
      "python",
      "sql",
      "analytics",
      "analysis",
      "data",
      "etl",
      "warehouse",
    ],
    requirements: [
      {
        key: "data-analysis",
        label: "Data analysis",
        priority: "required",
      },
      {
        key: "data-quality",
        label: "Data quality",
        priority: "preferred",
      },
    ],
    skills: [
      {
        key: "sql",
        label: "SQL",
        sourceRequirementKeys: ["data-analysis"],
        weight: 5,
      },
      {
        key: "data-validation",
        label: "Data validation",
        sourceRequirementKeys: ["data-quality"],
        weight: 4,
      },
    ],
    summary: "data and analysis terms",
  },
];

function mockJobTargetAnalysis({ description, title }) {
  const normalizedDescription = description.toLowerCase();
  const descriptionTerms = normalizedDescription.split(/[^a-z0-9.+#-]+/);
  const matches = mockJobTargetProfiles.filter(({ matchTerms }) =>
    matchTerms.some((term) => descriptionTerms.includes(term)),
  );
  if (!matches.length) {
    return {
      requirements: [
        {
          evidenceTerms: ["limited matching terms"],
          key: "role-fundamentals",
          label: "Role fundamentals",
          priority: "context",
        },
      ],
      roleSummary: `Mock coverage for ${title} is broad because this description has no supported role terms. Add role-specific detail before practising.`,
      skills: [
        {
          key: "role-fundamentals",
          label: "Role fundamentals",
          sourceRequirementKeys: ["role-fundamentals"],
          weight: 3,
        },
      ],
    };
  }

  const matchedTerms = matches.flatMap(({ matchTerms }) =>
    matchTerms.filter((term) => descriptionTerms.includes(term)),
  );
  return {
    requirements: matches.flatMap(({ requirements }) =>
      requirements.map((requirement) => ({
        ...requirement,
        evidenceTerms: matchedTerms.slice(0, 5),
      })),
    ),
    roleSummary: `Mock coverage for ${title} matched ${matches.map(({ summary }) => summary).join(" and ")} in saved description. Use it as practice context, not a hiring assessment.`,
    skills: matches.flatMap(({ skills }) => skills),
  };
}

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

function mockAdaptiveDecision({
  coveragePlan,
  focusSkillKey,
  level,
  previousQuestions,
  sessionPurpose,
}) {
  if (previousQuestions.length === 0) {
    if (sessionPurpose === "targeted_practice") {
      const coverage = coveragePlan.find(({ skillKeys }) =>
        skillKeys.includes(focusSkillKey),
      );
      return {
        coverage,
        decisionType: "retest",
        difficulty: level,
        parentQuestionOrder: null,
        reasonCode: "targeted_retest",
      };
    }
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

function mockAdaptivePrompt({ challengeDirective, coverage, decision, level }) {
  const instruction = {
    baseline: `Explain ${coverage.label} at a ${level} level.`,
    clarify: `Clarify ${coverage.label} at a ${level} level with a concrete example and reasoning.`,
    deepen: `Deepen your ${coverage.label} explanation at a ${level} level by comparing one trade-off.`,
    recover: `Revisit ${coverage.label} at a ${level} level. State fundamentals, then give a concrete example.`,
    retest: `Retest ${coverage.label} at a ${level} level with a concise explanation and concrete example.`,
    switch_topic: `Shift focus to ${coverage.label} at a ${level} level. Explain core approach and one trade-off.`,
  }[decision.decisionType];

  return challengeDirective
    ? `Challenge "${challengeDirective.anchorText}": ${instruction}`
    : instruction;
}

export function createMockAiProvider() {
  return {
    async generateAdaptiveQuestion({
      challengeDirective,
      coveragePlan,
      focusSkillKey,
      level,
      previousQuestions,
      sessionPurpose,
    }) {
      const decision = mockAdaptiveDecision({
        coveragePlan,
        focusSkillKey,
        level,
        previousQuestions,
        sessionPurpose,
      });
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
        prompt: mockAdaptivePrompt({
          challengeDirective,
          coverage,
          decision,
          level,
        }),
        reasonCode: decision.reasonCode,
        testedSkillKeys: coverage.skillKeys.slice(0, 3),
        topicKey: coverage.topicKey,
      };
    },

    async analyzeJobTarget({ description, title }) {
      return mockJobTargetAnalysis({ description, title });
    },

    async extractProjectDrafts({ resumeContext }) {
      const summary = resumeContext
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.length >= 5 && !line.startsWith("["))
        ?.slice(0, 1000);
      const technologies = [
        ...resumeContext.matchAll(
          /\b(JavaScript|TypeScript|React|Node\.js|Python|Java|MongoDB|Express)\b/gi,
        ),
      ]
        .map(([technology]) => technology)
        .filter(
          (technology, index, values) =>
            values.findIndex(
              (value) => value.toLowerCase() === technology.toLowerCase(),
            ) === index,
        )
        .slice(0, 15);
      const draft = {
        name: null,
        role: null,
        summary: summary || null,
        technologies,
        responsibilities: [],
        architecture: [],
        decisions: [],
        tradeoffs: [],
        claims: [],
      };
      return {
        drafts: [
          {
            ...draft,
            missingFields: Object.entries(draft)
              .filter(([, value]) => value === null || value.length === 0)
              .map(([field]) => field),
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

    async evaluateV2Answer({ testedSkills }) {
      return {
        accuracyScore: 78,
        clarityScore: 76,
        confidenceScore: 74,
        improvements: ["Add one concrete example to support your explanation."],
        nextStep: "Practise giving a concise answer with a concrete example.",
        overallScore: 76,
        skillEvidence: testedSkills.map(({ key }, index) => ({
          evidenceStrength: index === 0 ? "direct" : "supporting",
          outcome: "partial",
          reasonCode: "answer_quality",
          skillKey: key,
        })),
        strengths: ["Explains the core idea clearly."],
      };
    },
  };
}
