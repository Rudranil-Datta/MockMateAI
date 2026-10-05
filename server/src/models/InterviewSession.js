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
const projectChallengeAxes = [
  "architecture",
  "technology",
  "data",
  "security",
  "testing",
  "deployment",
  "trade-off",
  "failure-scenario",
];
const challengeAnchorKeyPattern =
  /^(architecture|claims|decisions|responsibilities|technologies|tradeoffs):[0-9]+$/;
const maxContextSnapshotBytes = 16 * 1024;

const snapshotRequirementSchema = new mongoose.Schema(
  {
    evidenceTerms: {
      default: () => [],
      type: [String],
      validate: {
        validator: (items) =>
          items.length <= 5 &&
          items.every((item) => item.length >= 2 && item.length <= 80),
      },
    },
    key: {
      match: skillKeyPattern,
      maxlength: 50,
      minlength: 2,
      required: true,
      type: String,
    },
    label: {
      maxlength: 80,
      minlength: 2,
      required: true,
      trim: true,
      type: String,
    },
    priority: {
      enum: ["required", "preferred", "context"],
      required: true,
      type: String,
    },
  },
  { _id: false },
);

const snapshotSkillSchema = new mongoose.Schema(
  {
    key: {
      match: skillKeyPattern,
      maxlength: 50,
      minlength: 2,
      required: true,
      type: String,
    },
    label: {
      maxlength: 80,
      minlength: 2,
      required: true,
      trim: true,
      type: String,
    },
    sourceRequirementKeys: {
      required: true,
      type: [String],
      validate: {
        validator: (items) => items.length >= 1 && items.length <= 5,
      },
    },
    weight: { max: 5, min: 1, required: true, type: Number },
  },
  { _id: false },
);

const snapshotAnalysisSchema = new mongoose.Schema(
  {
    requirements: {
      required: true,
      type: [snapshotRequirementSchema],
      validate: {
        validator: (items) => items.length >= 1 && items.length <= 12,
      },
    },
    roleSummary: {
      maxlength: 500,
      minlength: 20,
      required: true,
      trim: true,
      type: String,
    },
    skills: {
      required: true,
      type: [snapshotSkillSchema],
      validate: {
        validator: (items) => items.length >= 1 && items.length <= 12,
      },
    },
  },
  { _id: false },
);

const snapshotClaimSchema = new mongoose.Schema(
  {
    evidence: {
      default: null,
      maxlength: 300,
      minlength: 5,
      trim: true,
      type: String,
    },
    text: {
      maxlength: 300,
      minlength: 5,
      required: true,
      trim: true,
      type: String,
    },
  },
  { _id: false },
);

function boundedSnapshotList(minimum, maximum, itemMinimum, itemMaximum) {
  return {
    validator: (items) =>
      items.length >= minimum &&
      items.length <= maximum &&
      items.every(
        (item) =>
          typeof item === "string" &&
          item.trim().length >= itemMinimum &&
          item.trim().length <= itemMaximum,
      ) &&
      new Set(items.map((item) => item.trim().toLowerCase())).size ===
        items.length,
  };
}

const snapshotProjectFactsSchema = new mongoose.Schema(
  {
    architecture: {
      required: true,
      type: [String],
      validate: boundedSnapshotList(1, 10, 5, 300),
    },
    claims: {
      default: () => [],
      type: [snapshotClaimSchema],
      validate: {
        validator: (items) =>
          items.length <= 8 &&
          new Set(items.map(({ text }) => text.trim().toLowerCase())).size ===
            items.length,
      },
    },
    decisions: {
      default: () => [],
      type: [String],
      validate: boundedSnapshotList(0, 8, 5, 300),
    },
    name: {
      maxlength: 120,
      minlength: 2,
      required: true,
      trim: true,
      type: String,
    },
    responsibilities: {
      required: true,
      type: [String],
      validate: boundedSnapshotList(1, 10, 5, 300),
    },
    role: {
      maxlength: 120,
      minlength: 2,
      required: true,
      trim: true,
      type: String,
    },
    summary: {
      maxlength: 1000,
      minlength: 20,
      required: true,
      trim: true,
      type: String,
    },
    technologies: {
      required: true,
      type: [String],
      validate: boundedSnapshotList(1, 15, 1, 50),
    },
    tradeoffs: {
      default: () => [],
      type: [String],
      validate: boundedSnapshotList(0, 8, 5, 300),
    },
  },
  { _id: false },
);

const contextSnapshotSchema = new mongoose.Schema(
  {
    analysis: snapshotAnalysisSchema,
    displayLabel: {
      maxlength: 250,
      minlength: 2,
      required: true,
      trim: true,
      type: String,
    },
    facts: snapshotProjectFactsSchema,
    kind: {
      enum: ["job_target", "candidate_project"],
      required: true,
      type: String,
    },
    sourceId: {
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    sourceUpdatedAt: { required: true, type: Date },
  },
  { _id: false },
);

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
    challengeAnchorKey: {
      match: challengeAnchorKeyPattern,
      maxlength: 50,
      type: String,
    },
    challengeAxis: { enum: projectChallengeAxes, type: String },
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

adaptiveDecisionSchema.pre("validate", function validateChallengeMetadata() {
  if (Boolean(this.challengeAxis) !== Boolean(this.challengeAnchorKey)) {
    this.invalidate(
      "challengeAxis",
      "Project challenge metadata must be stored as one complete group.",
    );
  }
});

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

const skillContextSchema = new mongoose.Schema(
  {
    confidenceLabel: {
      enum: ["provisional", "emerging", "established"],
      required: true,
      type: String,
    },
    key: {
      match: skillKeyPattern,
      maxlength: 50,
      minlength: 2,
      required: true,
      type: String,
    },
    masteryScore: { max: 100, min: 0, required: true, type: Number },
    label: { maxlength: 80, minlength: 2, required: true, type: String },
  },
  { _id: false },
);

const skillEvidenceOutputSchema = new mongoose.Schema(
  {
    evidenceStrength: {
      enum: ["direct", "supporting"],
      required: true,
      type: String,
    },
    outcome: {
      enum: ["strong", "partial", "weak", "missing"],
      required: true,
      type: String,
    },
    reasonCode: {
      enum: ["answer_quality", "incomplete_evidence", "missing_evidence"],
      required: true,
      type: String,
    },
    skillKey: {
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
  skillEvidenceOutput: {
    type: [skillEvidenceOutputSchema],
    validate: {
      validator: (items) =>
        items === undefined ||
        items.length === 0 ||
        (items.length >= 1 &&
          items.length <= 3 &&
          new Set(items.map(({ skillKey }) => skillKey)).size === items.length),
    },
  },
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
  challengeAnchorKey: {
    match: challengeAnchorKeyPattern,
    maxlength: 50,
    type: String,
  },
  challengeAxis: { enum: projectChallengeAxes, type: String },
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
  if (Boolean(this.challengeAxis) !== Boolean(this.challengeAnchorKey)) {
    this.invalidate(
      "challengeAxis",
      "Project challenge metadata must be stored as one complete group.",
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
    contextSnapshot: contextSnapshotSchema,
    focusSkillKey: {
      match: skillKeyPattern,
      maxlength: 50,
      minlength: 2,
      trim: true,
      type: String,
    },
    interviewType: {
      enum: [
        "DSA",
        "HR",
        "System Design",
        "Role Simulation",
        "Project Defense",
      ],
      required: true,
      type: String,
    },
    level: {
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
      type: String,
    },
    jobTargetId: {
      ref: "JobTarget",
      type: mongoose.Schema.Types.ObjectId,
    },
    projectId: {
      ref: "CandidateProject",
      type: mongoose.Schema.Types.ObjectId,
    },
    questions: {
      default: () => [],
      type: [questionSchema],
      validate: hasAtMost(maxQuestionsPerInterview),
    },
    evidenceSyncStatus: {
      default: "ready",
      enum: ["ready", "pending"],
      required: true,
      type: String,
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
    skillContextSnapshot: {
      type: [skillContextSchema],
      validate: {
        validator: (items) => items.length <= 5,
      },
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
  const isRoleSimulation = this.interviewType === "Role Simulation";
  const isProjectDefense = this.interviewType === "Project Defense";
  const isTargetedPractice = this.sessionPurpose === "targeted_practice";
  if (isTargetedPractice !== Boolean(this.focusSkillKey)) {
    this.invalidate(
      "focusSkillKey",
      "Targeted practice requires one focus skill.",
    );
  }
  if (
    isTargetedPractice &&
    !this.skillContextSnapshot?.some(({ key }) => key === this.focusSkillKey)
  ) {
    this.invalidate(
      "skillContextSnapshot",
      "Targeted practice requires its focus skill snapshot.",
    );
  }
  if (
    (isRoleSimulation &&
      !(
        this.jobTargetId &&
        !this.projectId &&
        this.contextSnapshot?.kind === "job_target" &&
        this.contextSnapshot.analysis &&
        !this.contextSnapshot.facts
      )) ||
    (isProjectDefense &&
      !(
        this.projectId &&
        !this.jobTargetId &&
        this.contextSnapshot?.kind === "candidate_project" &&
        this.contextSnapshot.facts &&
        !this.contextSnapshot.analysis
      )) ||
    (!isRoleSimulation &&
      !isProjectDefense &&
      (this.jobTargetId || this.projectId || this.contextSnapshot))
  ) {
    this.invalidate(
      "contextSnapshot",
      "Context-bound interviews require one matching source snapshot.",
    );
  }
  if (
    isRoleSimulation &&
    this.jobTargetId?.toString() !== this.contextSnapshot?.sourceId?.toString()
  ) {
    this.invalidate(
      "contextSnapshot.sourceId",
      "Snapshot source must match the Job Target.",
    );
  }
  if (
    isProjectDefense &&
    this.projectId?.toString() !== this.contextSnapshot?.sourceId?.toString()
  ) {
    this.invalidate(
      "contextSnapshot.sourceId",
      "Snapshot source must match the Candidate Project.",
    );
  }
  if (
    this.contextSnapshot &&
    Buffer.byteLength(JSON.stringify(this.contextSnapshot.toObject()), "utf8") >
      maxContextSnapshotBytes
  ) {
    this.invalidate("contextSnapshot", "Context snapshot is too large.");
  }

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
    if (
      (question.challengeAxis || question.challengeAnchorKey) &&
      (!isProjectDefense || !question.parentQuestionId || question.order === 1)
    ) {
      this.invalidate(
        "questions",
        "Project challenge metadata requires a Project Defense follow-up.",
      );
    }
    earlierQuestionIds.add(question.id);
  }

  if (
    (this.questionGeneration?.decision?.challengeAxis ||
      this.questionGeneration?.decision?.challengeAnchorKey) &&
    !isProjectDefense
  ) {
    this.invalidate(
      "questionGeneration.decision",
      "Only Project Defense can stage challenge metadata.",
    );
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
