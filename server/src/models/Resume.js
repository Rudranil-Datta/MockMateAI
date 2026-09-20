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
      required() {
        return this.extractionStatus === "failed";
      },
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
      maxlength: 50000,
      required() {
        return this.extractionStatus === "completed";
      },
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
      max: 5 * 1024 * 1024,
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

resumeSchema.pre("validate", function validateExtractionState() {
  if (this.extractionStatus === "completed") {
    if (this.extractionError) {
      this.invalidate(
        "extractionError",
        "Completed extraction cannot retain an error.",
      );
    }
  } else if (this.extractedText) {
    this.invalidate(
      "extractedText",
      "Only completed extraction can retain extracted text.",
    );
  }

  if (this.extractionStatus !== "failed" && this.extractionError) {
    this.invalidate(
      "extractionError",
      "Only failed extraction can retain an error.",
    );
  }
});

resumeSchema.index({ userId: 1, createdAt: -1 });

const Resume = mongoose.models.Resume || mongoose.model("Resume", resumeSchema);

export default Resume;
