import { mkdir, rm } from "node:fs/promises";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";

import multer from "multer";

import { AppError } from "../utils/AppError.js";

const extensions = new Set([".md", ".markdown", ".txt"]);
const mimeTypes = new Set(["text/markdown", "text/plain", "text/x-markdown"]);

function uploadError(error) {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE")
    return new AppError(
      "README_IMPORT_TOO_LARGE",
      "README import exceeds the allowed size.",
      { status: 413 },
    );
  if (error instanceof multer.MulterError)
    return new AppError(
      "INVALID_README_IMPORT",
      "Upload exactly one README text file using the readme field.",
      { status: 400 },
    );
  if (error instanceof AppError) return error;
  return new AppError("README_IMPORT_FAILED", "README could not be imported.");
}

export function createReadmeImportUpload({
  maxReadmeImportSizeBytes,
  readmeImportUploadDir,
}) {
  const upload = multer({
    fileFilter(_request, file, callback) {
      const valid =
        extensions.has(extname(file.originalname).toLowerCase()) &&
        mimeTypes.has(file.mimetype);
      callback(
        valid
          ? null
          : new AppError(
              "UNSUPPORTED_README_IMPORT",
              "Choose a Markdown or text README file.",
              { status: 415 },
            ),
        valid,
      );
    },
    limits: { fileSize: maxReadmeImportSizeBytes, files: 1 },
    storage: multer.diskStorage({
      destination(_request, _file, callback) {
        mkdir(readmeImportUploadDir, { recursive: true }).then(
          () => callback(null, readmeImportUploadDir),
          callback,
        );
      },
      filename(_request, _file, callback) {
        callback(null, `${randomUUID()}.txt`);
      },
    }),
  }).single("readme");
  return (request, response, next) =>
    upload(request, response, (error) => {
      if (!error) return next();
      return rm(request.file?.path, { force: true })
        .catch(() => undefined)
        .finally(() => next(uploadError(error)));
    });
}
