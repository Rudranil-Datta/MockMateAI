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

const candidateProjectSchema = new mongoose.Schema(
  {
    architecture: {
      required: true,
      type: [String],
      validate: boundedUniqueList(1, 10, 5, 300),
    },
    claims: {
      default: () => [],
      type: [claimSchema],
      validate: {
        validator: (items) =>
          items.length <= 8 && uniqueStrings(items.map(({ text }) => text)),
      },
    },
    confirmedAt: { required: true, type: Date },
    decisions: {
      default: () => [],
      type: [String],
      validate: boundedUniqueList(0, 8, 5, 300),
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
      validate: boundedUniqueList(1, 10, 5, 300),
    },
    role: {
      maxlength: 120,
      minlength: 2,
      required: true,
      trim: true,
      type: String,
    },
    sourceResumeId: { ref: "Resume", type: mongoose.Schema.Types.ObjectId },
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
      validate: boundedUniqueList(1, 15, 1, 50),
    },
    tradeoffs: {
      default: () => [],
      type: [String],
      validate: boundedUniqueList(0, 8, 5, 300),
    },
    userId: {
      ref: "User",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true },
);

candidateProjectSchema.pre("validate", function validateSerializedSize() {
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

const CandidateProject =
  mongoose.models.CandidateProject ||
  mongoose.model("CandidateProject", candidateProjectSchema);

export default CandidateProject;
