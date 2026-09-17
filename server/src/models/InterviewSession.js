import mongoose from "mongoose";

export const maxAnswersPerQuestion = 1;
export const maxQuestionsPerInterview = 5;

const scoreField = {
  max: 100,
  min: 0,
  type: Number,
};

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
    completedAt: Date,
    confidenceScore: scoreField,
    evaluatedAt: Date,
    improvements: {
      default: undefined,
      type: [String],
    },
    nextStep: {
      maxlength: 1000,
      trim: true,
      type: String,
    },
    overallScore: scoreField,
    strengths: {
      default: undefined,
      type: [String],
    },
  },
  { _id: false },
);

const answerSchema = new mongoose.Schema({
  evaluationStatus: {
    default: "not_started",
    enum: ["not_started", "pending", "completed"],
    required: true,
    type: String,
  },
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
    trim: true,
    type: String,
  },
  voiceStorageKey: {
    maxlength: 500,
    trim: true,
    type: String,
  },
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
  order: {
    min: 1,
    required: true,
    type: Number,
  },
  prompt: {
    maxlength: 2000,
    required: true,
    trim: true,
    type: String,
  },
});

const summarySchema = new mongoose.Schema(
  {
    accuracyScore: scoreField,
    clarityScore: scoreField,
    confidenceScore: scoreField,
    improvements: {
      default: undefined,
      type: [String],
    },
    overallScore: scoreField,
    recommendation: {
      maxlength: 1000,
      trim: true,
      type: String,
    },
    strengths: {
      default: undefined,
      type: [String],
    },
  },
  { _id: false },
);

const interviewSessionSchema = new mongoose.Schema(
  {
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
    resumeId: {
      ref: "Resume",
      type: mongoose.Schema.Types.ObjectId,
    },
    startedAt: Date,
    status: {
      default: "created",
      enum: ["created", "active", "completed"],
      required: true,
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
  if (this.status === "completed") {
    if (!this.completedAt) {
      this.invalidate("completedAt", "Completed sessions require completedAt.");
    }

    if (!this.summary) {
      this.invalidate("summary", "Completed sessions require a summary.");
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

const InterviewSession =
  mongoose.models.InterviewSession ||
  mongoose.model("InterviewSession", interviewSessionSchema);

export default InterviewSession;
