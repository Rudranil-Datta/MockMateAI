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

export function createMockAiProvider() {
  return {
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
