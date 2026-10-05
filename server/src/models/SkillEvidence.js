import mongoose from "mongoose";

const skillKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const skillEvidenceSchema = new mongoose.Schema(
  {
    answerId: { required: true, type: mongoose.Schema.Types.ObjectId },
    difficulty: {
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
      type: String,
    },
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
    questionId: { required: true, type: mongoose.Schema.Types.ObjectId },
    reasonCode: {
      enum: ["answer_quality", "incomplete_evidence", "missing_evidence"],
      required: true,
      type: String,
    },
    sessionId: { required: true, type: mongoose.Schema.Types.ObjectId },
    skillKey: {
      match: skillKeyPattern,
      maxlength: 50,
      minlength: 2,
      required: true,
      trim: true,
      type: String,
    },
    skillLabel: {
      maxlength: 80,
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
  { timestamps: { createdAt: true, updatedAt: false } },
);

skillEvidenceSchema.index(
  { userId: 1, answerId: 1, skillKey: 1 },
  { unique: true },
);
skillEvidenceSchema.index({ userId: 1, skillKey: 1, createdAt: -1 });
skillEvidenceSchema.index({ userId: 1, sessionId: 1 });

const SkillEvidence =
  mongoose.models.SkillEvidence ||
  mongoose.model("SkillEvidence", skillEvidenceSchema);

export default SkillEvidence;
