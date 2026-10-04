import mongoose from "mongoose";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const requirementSchema = new mongoose.Schema(
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
      match: slugPattern,
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

const skillSchema = new mongoose.Schema(
  {
    key: {
      match: slugPattern,
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
      type: [String],
      validate: {
        validator: (items) => items.length >= 1 && items.length <= 5,
      },
    },
    weight: { max: 5, min: 1, required: true, type: Number },
  },
  { _id: false },
);

const analysisSchema = new mongoose.Schema(
  {
    requirements: {
      required: true,
      type: [requirementSchema],
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
      type: [skillSchema],
      validate: {
        validator: (items) => items.length >= 1 && items.length <= 12,
      },
    },
  },
  { _id: false },
);

const jobTargetSchema = new mongoose.Schema(
  {
    analysis: analysisSchema,
    analysisClaimId: { maxlength: 100, trim: true, type: String },
    analysisFailureCode: {
      enum: ["quota", "timeout", "unavailable", "invalid_response"],
      type: String,
    },
    analysisRequestId: {
      maxlength: 100,
      required: true,
      trim: true,
      type: String,
    },
    analysisStartedAt: Date,
    company: { maxlength: 120, minlength: 2, trim: true, type: String },
    description: {
      maxlength: 12000,
      minlength: 100,
      required: true,
      trim: true,
      type: String,
    },
    status: {
      enum: ["analysis_pending", "ready", "analysis_failed"],
      required: true,
      type: String,
    },
    title: {
      maxlength: 120,
      minlength: 2,
      required: true,
      trim: true,
      type: String,
    },
    userId: {
      ref: "User",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true },
);

jobTargetSchema.pre("validate", function validateAnalysisState() {
  const isPending = this.status === "analysis_pending";
  const isReady = this.status === "ready";
  const isFailed = this.status === "analysis_failed";

  if (isPending && (!this.analysisClaimId || !this.analysisStartedAt)) {
    this.invalidate(
      "status",
      "Pending analysis requires a claim and start time.",
    );
  }
  if (!isPending && (this.analysisClaimId || this.analysisStartedAt)) {
    this.invalidate("status", "Only pending analysis can retain claim state.");
  }
  if (isReady !== Boolean(this.analysis)) {
    this.invalidate("analysis", "Only ready targets require analysis.");
  }
  if (isFailed !== Boolean(this.analysisFailureCode)) {
    this.invalidate(
      "analysisFailureCode",
      "Only failed targets require a failure code.",
    );
  }
});

jobTargetSchema.index({ userId: 1, updatedAt: -1 });
jobTargetSchema.index({ userId: 1, status: 1, updatedAt: -1 });
jobTargetSchema.index({ userId: 1, analysisRequestId: 1 }, { unique: true });

const JobTarget =
  mongoose.models.JobTarget || mongoose.model("JobTarget", jobTargetSchema);

export default JobTarget;
