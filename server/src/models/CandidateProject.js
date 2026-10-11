import mongoose from "mongoose";

const maxProjectFactsBytes = 16 * 1024;

function uniqueStrings(items) {
  return (
    items.every((item) => typeof item === "string") &&
    new Set(items.map((item) => item.trim().toLowerCase())).size ===
      items.length
  );
}

function boundedUniqueList(minimum, maximum, itemMinimum, itemMaximum) {
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
      uniqueStrings(items),
  };
}

const claimSchema = new mongoose.Schema(
  {
    evidence: {
      default: null,
      maxlength: 600,
      minlength: 5,
      trim: true,
      type: String,
    },
    text: {
      maxlength: 600,
      minlength: 5,
      required: true,
      trim: true,
      type: String,
    },
  },
  { _id: false },
);

const candidateProjectSchema = new mongoose.Schema(
  {
    architecture: {
      type: [String],
      validate: boundedUniqueList(0, 10, 5, 600),
    },
    claims: {
      default: () => [],
      type: [claimSchema],
      validate: {
        validator: (items) =>
          items.length <= 8 && uniqueStrings(items.map(({ text }) => text)),
      },
    },
    confirmedAt: { type: Date },
    decisions: {
      default: () => [],
      type: [String],
      validate: boundedUniqueList(0, 8, 5, 600),
    },
    name: {
      maxlength: 120,
      minlength: 2,
      trim: true,
      type: String,
    },
    responsibilities: {
      type: [String],
      validate: boundedUniqueList(0, 10, 5, 600),
    },
    role: {
      maxlength: 120,
      minlength: 2,
      trim: true,
      type: String,
    },
    sourceResumeId: { ref: "Resume", type: mongoose.Schema.Types.ObjectId },
    summary: {
      maxlength: 1000,
      minlength: 20,
      trim: true,
      type: String,
    },
    technologies: {
      type: [String],
      validate: boundedUniqueList(0, 15, 1, 50),
    },
    tradeoffs: {
      default: () => [],
      type: [String],
      validate: boundedUniqueList(0, 8, 5, 600),
    },
    partialConfirmedAt: { type: Date },
    status: { default: "ready", enum: ["partial", "ready"], type: String },
    userId: {
      ref: "User",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true },
);

candidateProjectSchema.pre("validate", function validateSerializedSize() {
  if (this.status === "ready" && !this.confirmedAt) {
    this.invalidate(
      "confirmedAt",
      "Ready projects require confirmed project facts.",
    );
  }
  if (this.status === "partial" && this.confirmedAt) {
    this.invalidate(
      "confirmedAt",
      "Partial projects cannot have ready confirmation.",
    );
  }
  if (this.status === "partial" && !this.partialConfirmedAt) {
    this.invalidate(
      "partialConfirmedAt",
      "Partial projects require user confirmation.",
    );
  }
  const facts = {
    architecture: this.architecture,
    claims: this.claims?.map(({ evidence, text }) => ({ evidence, text })),
    decisions: this.decisions,
    name: this.name,
    responsibilities: this.responsibilities,
    role: this.role,
    summary: this.summary,
    technologies: this.technologies,
    tradeoffs: this.tradeoffs,
  };
  if (Buffer.byteLength(JSON.stringify(facts), "utf8") > maxProjectFactsBytes) {
    this.invalidate(
      "summary",
      "Confirmed project facts exceed the allowed size.",
    );
  }
});

candidateProjectSchema.index({ userId: 1, updatedAt: -1 });
candidateProjectSchema.index({ userId: 1, confirmedAt: -1 });
candidateProjectSchema.index({ userId: 1, status: 1, updatedAt: -1 });

const CandidateProject =
  mongoose.models.CandidateProject ||
  mongoose.model("CandidateProject", candidateProjectSchema);

export default CandidateProject;
