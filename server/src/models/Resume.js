import mongoose from "mongoose";

const storageSchema = new mongoose.Schema(
  {
    key: {
      maxlength: 255,
      required: true,
      trim: true,
      type: String,
    },
    provider: {
      enum: ["local"],
      required: true,
      type: String,
    },
  },
  { _id: false },
);

const resumeSchema = new mongoose.Schema(
  {
    extractionError: {
      maxlength: 500,
      trim: true,
      type: String,
    },
    extractionStatus: {
      default: "pending",
      enum: ["pending", "completed", "failed"],
      required: true,
      type: String,
    },
    extractedText: {
      maxlength: 100000,
      type: String,
    },
    mimeType: {
      enum: ["application/pdf"],
      required: true,
      type: String,
    },
    originalName: {
      maxlength: 255,
      required: true,
      trim: true,
      type: String,
    },
    sizeBytes: {
      min: 1,
      required: true,
      type: Number,
    },
    storage: {
      required: true,
      type: storageSchema,
    },
    userId: {
      ref: "User",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true },
);

resumeSchema.index({ userId: 1, createdAt: -1 });

const Resume = mongoose.models.Resume || mongoose.model("Resume", resumeSchema);

export default Resume;
