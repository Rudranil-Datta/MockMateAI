import { open, rm } from "node:fs/promises";
import { basename } from "node:path";

import Resume from "../models/Resume.js";
import { AppError } from "../utils/AppError.js";
import { getOwnedResourceFilter } from "../utils/getOwnedResourceFilter.js";
import { extractPdfText as defaultExtractPdfText } from "./pdfTextExtractor.js";

const maxResumeContextLength = 2_000;
const safeExtractionError = "Resume text could not be extracted.";

async function removeStoredFile(path) {
  if (path) {
    await rm(path, { force: true });
  }
}

function safeOriginalName(originalName) {
  const normalizedName = basename(originalName || "resume.pdf")
    .replaceAll(/[\\/]/g, "_")
    .replaceAll(/\p{Cc}/gu, "_")
    .slice(0, 255);

  return normalizedName || "resume.pdf";
}

function toSafeResume(resume) {
  return {
    createdAt: resume.createdAt.toISOString(),
    extractionStatus: resume.extractionStatus,
    id: resume.id,
    mimeType: resume.mimeType,
    originalName: resume.originalName,
    sizeBytes: resume.sizeBytes,
  };
}

function toResumeContext(text) {
  return text.replaceAll(/\s+/g, " ").trim().slice(0, maxResumeContextLength);
}

async function hasPdfSignature(path) {
  const fileHandle = await open(path, "r");

  try {
    const signature = Buffer.alloc(5);
    const { bytesRead } = await fileHandle.read(signature, 0, 5, 0);

    return bytesRead === 5 && signature.toString("utf8") === "%PDF-";
  } finally {
    await fileHandle.close();
  }
}

export function createResumeService({
  extractPdfText = defaultExtractPdfText,
  resumeModel = Resume,
} = {}) {
  const service = {
    async createResume({ file, userId }) {
      if (!file) {
        throw new AppError(
          "RESUME_REQUIRED",
          "Choose a PDF resume to upload.",
          {
            status: 400,
          },
        );
      }

      let isPersisted = false;

      try {
        if (!(await hasPdfSignature(file.path))) {
          throw new AppError(
            "INVALID_RESUME_FILE",
            "Resume must be a valid PDF file.",
            { status: 415 },
          );
        }

        let resume = await resumeModel.create({
          extractionStatus: "pending",
          mimeType: file.mimetype,
          originalName: safeOriginalName(file.originalname),
          sizeBytes: file.size,
          storage: { key: file.filename, provider: "local" },
          userId,
        });
        isPersisted = true;

        resume = await service.extractPendingResume({
          path: file.path,
          resumeId: resume.id,
          userId,
        });

        return toSafeResume(resume);
      } catch (error) {
        if (!isPersisted) {
          await removeStoredFile(file.path);
        }
        throw error;
      }
    },

    async extractPendingResume({ path, resumeId, userId }) {
      const pendingResume = await resumeModel.findOne({
        ...getOwnedResourceFilter(resumeId, userId),
        extractionStatus: "pending",
      });

      if (!pendingResume) {
        throw new AppError("RESUME_NOT_FOUND", "Resume not found.", {
          status: 404,
        });
      }

      try {
        const extractedText = await extractPdfText(path);
        const completedResume = await resumeModel.findOneAndUpdate(
          {
            ...getOwnedResourceFilter(resumeId, userId),
            extractionStatus: "pending",
          },
          {
            $set: { extractedText, extractionStatus: "completed" },
            $unset: { extractionError: "" },
          },
          { returnDocument: "after", runValidators: true },
        );

        if (!completedResume) {
          throw new AppError("RESUME_EXTRACTION_CONFLICT", "Resume changed.", {
            status: 409,
          });
        }

        return completedResume;
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        const failedResume = await resumeModel.findOneAndUpdate(
          {
            ...getOwnedResourceFilter(resumeId, userId),
            extractionStatus: "pending",
          },
          {
            $set: {
              extractionError: safeExtractionError,
              extractionStatus: "failed",
            },
            $unset: { extractedText: "" },
          },
          { returnDocument: "after", runValidators: true },
        );

        if (!failedResume) {
          throw new AppError("RESUME_EXTRACTION_CONFLICT", "Resume changed.", {
            status: 409,
          });
        }

        return failedResume;
      }
    },

    async getOwnedResumeContext({ resumeId, userId }) {
      const resume = await resumeModel
        .findOne({
          ...getOwnedResourceFilter(resumeId, userId),
          extractionStatus: "completed",
        })
        .select("extractedText")
        .lean();

      const context = toResumeContext(resume?.extractedText || "");

      if (!context) {
        throw new AppError(
          "RESUME_CONTEXT_UNAVAILABLE",
          "Resume context is unavailable. Choose another resume or continue without one.",
          { status: 422 },
        );
      }

      return context;
    },
  };

  return service;
}
