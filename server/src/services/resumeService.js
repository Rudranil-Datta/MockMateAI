import { open, rm } from "node:fs/promises";
import { basename } from "node:path";

import Resume from "../models/Resume.js";
import { AppError } from "../utils/AppError.js";

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

export function createResumeService({ resumeModel = Resume } = {}) {
  return {
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

      try {
        if (!(await hasPdfSignature(file.path))) {
          throw new AppError(
            "INVALID_RESUME_FILE",
            "Resume must be a valid PDF file.",
            { status: 415 },
          );
        }

        const resume = await resumeModel.create({
          extractionStatus: "pending",
          mimeType: file.mimetype,
          originalName: safeOriginalName(file.originalname),
          sizeBytes: file.size,
          storage: { key: file.filename, provider: "local" },
          userId,
        });

        return toSafeResume(resume);
      } catch (error) {
        await removeStoredFile(file.path);
        throw error;
      }
    },
  };
}
