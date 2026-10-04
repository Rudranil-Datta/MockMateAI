import mongoose from "mongoose";

export const maxAnswersPerQuestion = 1;
export const maxQuestionsPerInterview = 5;

const scoreField = {
  max: 100,
  min: 0,
  required: true,
  type: Number,
};

const feedbackListField = {
  required: true,
  type: [String],
  validate: {
    message: "Must contain between 1 and 3 bounded text entries.",
    validator: (value) =>
      Array.isArray(value) &&
      value.length >= 1 &&
      value.length <= 3 &&
      value.every(
        (item) =>
          typeof item === "string" &&
          item.trim().length >= 1 &&
          item.length <= 500,
      ),
  },
};

const skillKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const decisionTypes = [
  "baseline",
  "deepen",
  "clarify",
  "recover",
  "switch_topic",
  "retest",
];
const reasonCodes = [
  "opening",
  "strong_evidence",
  "partial_evidence",
  "weak_evidence",
  "missing_evidence",
  "coverage_gap",
  "targeted_retest",
];

const testedSkillKeysField = {
  default: undefined,
  type: [
    {
      maxlength: 50,
      minlength: 2,
      match: skillKeyPattern,
      trim: true,
      type: String,
    },
  ],
  validate: {
    message: "Must contain between 1 and 3 unique skill keys.",
    validator: (value) =>
      value === undefined ||
      (Array.isArray(value) &&
        value.length >= 1 &&
        value.length <= 3 &&
        new Set(value).size === value.length),
  },
};

const adaptiveDecisionSchema = new mongoose.Schema(
  {
    decisionType: { enum: decisionTypes, required: true, type: String },
    difficulty: {
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
      type: String,
    },
    parentQuestionOrder: { min: 1, type: Number },
    prompt: {
      maxlength: 2000,
      required: true,
      trim: true,
      type: String,
    },
    reasonCode: { enum: reasonCodes, required: true, type: String },
    testedSkillKeys: { ...testedSkillKeysField, required: true },
    topicKey: {
      match: skillKeyPattern,
      maxlength: 50,
      minlength: 2,
      required: true,
      trim: true,
      type: String,
    },
  },
  { _id: false },
);

function hasAtMost(maximum) {
  return {
    message: `Cannot contain more than ${maximum} entries.`,
    validator: (value) => Array.isArray(value) && value.length <= maximum,
  };
}

const feedbackSchema = new mongoose.Schema(
  {
    accuracyScore: scoreField,
    clarityScore: scoreField,
    confidenceScore: scoreField,
    evaluatedAt: { required: true, type: Date },
    improvements: feedbackListField,
    nextStep: {
      maxlength: 1000,
      required: true,
      trim: true,
      type: String,
    },
    overallScore: scoreField,
    strengths: feedbackListField,
  },
  { _id: false },
);

const answerSchema = new mongoose.Schema({
  evaluationClaimId: {
    maxlength: 100,
    trim: true,
    type: String,
  },
  evaluationKey: {
    maxlength: 100,
    trim: true,
    type: String,
  },
  evaluationOutput: feedbackSchema,
  evaluationStatus: {
    default: "not_started",
    enum: ["not_started", "pending", "completed"],
    required: true,
    type: String,
  },
  evaluationStartedAt: Date,
  feedback: feedbackSchema,
  inputMode: {
    enum: ["text", "voice"],
    required: true,
    type: String,
  },
  submittedAt: {
    required: true,
    type: Date,
  },
  text: {
    maxlength: 10000,
    required: true,
    trim: true,
    type: String,
  },
  voiceStorageKey: {
    maxlength: 500,
    trim: true,
    type: String,
  },
});

answerSchema.pre("validate", function validateEvaluationState() {
  if (this.evaluationStatus === "pending") {
    if (!this.evaluationStartedAt) {
      this.invalidate(
        "evaluationStartedAt",
        "Pending evaluation requires evaluationStartedAt.",
      );
    }
    if (!this.evaluationClaimId) {
      this.invalidate(
        "evaluationClaimId",
        "Pending evaluation requires evaluationClaimId.",
      );
    }
  } else {
    if (this.evaluationStartedAt) {
      this.invalidate(
        "evaluationStartedAt",
        "Only pending evaluation can set evaluationStartedAt.",
      );
    }
    if (this.evaluationClaimId) {
      this.invalidate(
        "evaluationClaimId",
        "Only pending evaluation can set evaluationClaimId.",
      );
    }
  }

  if (this.evaluationStatus === "completed") {
    if (!this.feedback) {
      this.invalidate("feedback", "Completed evaluation requires feedback.");
    }
    if (this.evaluationOutput) {
      this.invalidate(
        "evaluationOutput",
        "Completed evaluation cannot retain staged output.",
      );
    }
  } else if (this.feedback) {
    this.invalidate("feedback", "Only completed evaluation can set feedback.");
  }
});

const voiceTranscriptionSchema = new mongoose.Schema(
  {
    claimId: { maxlength: 100, trim: true, type: String },
    completedAt: Date,
    idempotencyKey: {
      maxlength: 100,
      required: true,
      trim: true,
      type: String,
    },
    mimeType: {
      enum: ["audio/mp4", "audio/ogg", "audio/opus", "audio/webm"],
      required: true,
      type: String,
    },
    startedAt: Date,
    status: {
      enum: ["processing", "completed"],
      required: true,
      type: String,
    },
    text: { maxlength: 10000, trim: true, type: String },
  },
  { _id: false },
);

voiceTranscriptionSchema.pre("validate", function validateTranscriptionState() {
  if (this.status === "processing") {
    if (!this.claimId || !this.startedAt) {
      this.invalidate(
        "status",
        "Processing transcription requires claim ownership and start time.",
      );
    }
  } else {
    if (!this.text || !this.completedAt) {
      this.invalidate(
        "status",
        "Completed transcription requires bounded text and completion time.",
      );
    }
    if (this.claimId || this.startedAt) {
      this.invalidate(
        "status",
        "Completed transcription cannot retain claim ownership.",
      );
    }
  }
});

const questionSchema = new mongoose.Schema({
  answers: {
    default: () => [],
    type: [answerSchema],
    validate: hasAtMost(maxAnswersPerQuestion),
  },
  generatedAt: {
    required: true,
    type: Date,
  },
  decisionType: { enum: decisionTypes, type: String },
  difficulty: {
    enum: ["beginner", "intermediate", "advanced"],
    type: String,
  },
  generationKey: {
    maxlength: 100,
    trim: true,
    type: String,
  },
  order: {
    min: 1,
    required: true,
    type: Number,
  },
  parentQuestionId: { type: mongoose.Schema.Types.ObjectId },
  prompt: {
    maxlength: 2000,
    required: true,
    trim: true,
    type: String,
  },
  reasonCode: { enum: reasonCodes, type: String },
  testedSkillKeys: testedSkillKeysField,
  topicKey: {
    match: skillKeyPattern,
    maxlength: 50,
    minlength: 2,
    trim: true,
    type: String,
  },
  voiceTranscription: voiceTranscriptionSchema,
});

questionSchema.pre("validate", function validateAdaptiveMetadata() {
  const requiredFields = [
    "topicKey",
    "testedSkillKeys",
    "difficulty",
    "decisionType",
    "reasonCode",
  ];
  const hasMetadata =
    requiredFields.some((field) => this.get(field) !== undefined) ||
    this.parentQuestionId !== undefined;
  if (
    hasMetadata &&
    requiredFields.some((field) => this.get(field) === undefined)
  ) {
    this.invalidate(
      "topicKey",
      "Adaptive question metadata must be stored as one complete group.",
    );
  }
});

const questionGenerationSchema = new mongoose.Schema(
  {
    claimId: {
      maxlength: 100,
      required: true,
      trim: true,
      type: String,
    },
    decision: adaptiveDecisionSchema,
    expectedQuestionCount: {
      max: maxQuestionsPerInterview - 1,
      min: 0,
      required: true,
      type: Number,
    },
    idempotencyKey: {
      maxlength: 100,
      required: true,
      trim: true,
      type: String,
    },
    prompt: {
      maxlength: 2000,
      trim: true,
      type: String,
    },
    startedAt: {
      required: true,
      type: Date,
    },
  },
  { _id: false },
);

questionGenerationSchema.pre("validate", function validateStagedDecision() {
  if (!this.decision) return;
  if (!this.prompt || this.prompt !== this.decision.prompt) {
    this.invalidate(
      "decision",
      "A staged adaptive decision must match its durable prompt.",
    );
  }
  const parentOrder = this.decision.parentQuestionOrder;
  if (!(
    parentOrder === null ||
    (Number.isInteger(parentOrder) &&
      parentOrder >= 1 &&
      parentOrder <= this.expectedQuestionCount)
  )) {
    this.invalidate(
      "decision.parentQuestionOrder",
      "A staged parent must reference an earlier question.",
    );
  }
});

const summarySchema = new mongoose.Schema(
  {
    accuracyScore: scoreField,
    clarityScore: scoreField,
    confidenceScore: scoreField,
    improvements: feedbackListField,
    overallScore: scoreField,
    recommendation: {
      maxlength: 1000,
      required: true,
      trim: true,
      type: String,
    },
    strengths: feedbackListField,
  },
  { _id: false },
);

const interviewSessionSchema = new mongoose.Schema(
  {
    focusSkillKey: {
      match: skillKeyPattern,
      maxlength: 50,
      minlength: 2,
      trim: true,
      type: String,
    },
    interviewType: {
      enum: ["DSA", "HR", "System Design"],
      required: true,
      type: String,
    },
    level: {
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
      type: String,
    },
    questions: {
      default: () => [],
      type: [questionSchema],
      validate: hasAtMost(maxQuestionsPerInterview),
    },
    questionGeneration: questionGenerationSchema,
    resumeId: {
      ref: "Resume",
      type: mongoose.Schema.Types.ObjectId,
    },
    sessionPurpose: {
      enum: ["standard", "targeted_practice"],
      type: String,
    },
    startedAt: {
      required() {
        return this.status !== "created";
      },
      type: Date,
    },
    status: {
      default: "created",
      enum: ["created", "active", "completed"],
      required: true,
      type: String,
    },
    startRequestId: {
      maxlength: 100,
      trim: true,
      type: String,
    },
    summary: summarySchema,
    completedAt: Date,
    userId: {
      ref: "User",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true },
);

interviewSessionSchema.pre("validate", function validateCompletion() {
  const earlierQuestionIds = new Set();
  for (const question of this.questions) {
    if (
      question.parentQuestionId &&
      !earlierQuestionIds.has(question.parentQuestionId.toString())
    ) {
      this.invalidate(
        "questions",
        "Question parent must reference an earlier question in this session.",
      );
    }
    earlierQuestionIds.add(question.id);
  }

  if (this.status === "completed") {
    if (!this.completedAt) {
      this.invalidate("completedAt", "Completed sessions require completedAt.");
    }

    if (!this.summary) {
      this.invalidate("summary", "Completed sessions require a summary.");
    }

    if (this.questionGeneration) {
      this.invalidate(
        "questionGeneration",
        "Completed sessions cannot retain question-generation work.",
      );
    }

    if (
      this.startedAt instanceof Date &&
      this.completedAt instanceof Date &&
      !Number.isNaN(this.startedAt.getTime()) &&
      !Number.isNaN(this.completedAt.getTime()) &&
      this.completedAt < this.startedAt
    ) {
      this.invalidate(
        "completedAt",
        "Completed sessions cannot finish before they start.",
      );
    }

    const answers = this.questions.flatMap((question) => question.answers);
    if (
      answers.some((answer) => answer.evaluationStatus === "pending") ||
      answers.some((answer) => Boolean(answer.evaluationOutput)) ||
      !answers.some(
        (answer) =>
          answer.evaluationStatus === "completed" && Boolean(answer.feedback),
      )
    ) {
      this.invalidate(
        "questions",
        "Completed sessions require evaluated feedback and no unfinished evaluation.",
      );
    }
  } else {
    if (this.completedAt) {
      this.invalidate(
        "completedAt",
        "Only completed sessions can set completedAt.",
      );
    }

    if (this.summary) {
      this.invalidate("summary", "Only completed sessions can set a summary.");
    }
  }
});

interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ userId: 1, status: 1, updatedAt: -1 });
interviewSessionSchema.index({ userId: 1, completedAt: -1 });
interviewSessionSchema.index({ resumeId: 1 });
interviewSessionSchema.index(
  { userId: 1, startRequestId: 1 },
  {
    partialFilterExpression: { startRequestId: { $type: "string" } },
    unique: true,
  },
);

const InterviewSession =
  mongoose.models.InterviewSession ||
  mongoose.model("InterviewSession", interviewSessionSchema);

export default InterviewSession;
