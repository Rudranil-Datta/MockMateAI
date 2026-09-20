import { mkdir, rm } from "node:fs/promises";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";

import multer from "multer";

import { AppError } from "../utils/AppError.js";

function unsupportedResumeError() {
  return new AppError(
    "UNSUPPORTED_RESUME_FILE",
    "Only PDF resumes are supported.",
    { status: 415 },
  );
}

function toUploadError(error) {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return new AppError(
      "RESUME_TOO_LARGE",
      "Resume exceeds the allowed file size.",
      { status: 413 },
    );
  }

  if (
    error instanceof multer.MulterError &&
    ["LIMIT_FILE_COUNT", "LIMIT_UNEXPECTED_FILE"].includes(error.code)
  ) {
    return new AppError(
      "INVALID_RESUME_UPLOAD",
      "Upload exactly one PDF using the resume field.",
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return error;
  }

  return new AppError("RESUME_UPLOAD_FAILED", "Resume could not be uploaded.");
}

export function createResumeUpload({ maxResumeSizeBytes, resumeUploadDir }) {
  const upload = multer({
    fileFilter(_request, file, callback) {
      const hasPdfExtension =
        extname(file.originalname).toLowerCase() === ".pdf";
      const hasPdfMimeType = file.mimetype === "application/pdf";

      callback(
        hasPdfExtension && hasPdfMimeType ? null : unsupportedResumeError(),
        hasPdfExtension && hasPdfMimeType,
      );
    },
    limits: { fileSize: maxResumeSizeBytes, files: 1 },
    storage: multer.diskStorage({
      destination(_request, _file, callback) {
        mkdir(resumeUploadDir, { recursive: true }).then(
          () => callback(null, resumeUploadDir),
          callback,
        );
      },
      filename(_request, _file, callback) {
        callback(null, `${randomUUID()}.pdf`);
      },
    }),
  }).single("resume");

  return (request, response, next) => {
    upload(request, response, (error) => {
      if (!error) {
        next();
        return;
      }

      rm(request.file?.path, { force: true })
        .catch(() => undefined)
        .finally(() => next(toUploadError(error)));
    });
  };
}
