import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import { extname } from "node:path";

import multer from "multer";

import { supportedAudioMimeTypes } from "../services/transcriptionService.js";
import { AppError } from "../utils/AppError.js";

const extensionByMimeType = new Map([
  ["audio/mp4", new Set([".m4a", ".mp4"])],
  ["audio/ogg", new Set([".ogg"])],
  ["audio/opus", new Set([".opus"])],
  ["audio/webm", new Set([".webm"])],
]);

function normalizeMimeType(value = "") {
  return value.toLowerCase().split(";", 1)[0].trim();
}

function unsupportedAudioError() {
  return new AppError(
    "UNSUPPORTED_AUDIO_FILE",
    "Use a supported WebM, Ogg, Opus, or MP4 voice recording.",
    { status: 415 },
  );
}

function toUploadError(error) {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return new AppError(
      "AUDIO_TOO_LARGE",
      "Voice recording exceeds the allowed file size.",
      { status: 413 },
    );
  }

  if (error instanceof multer.MulterError) {
    return new AppError(
      "INVALID_AUDIO_UPLOAD",
      "Upload exactly one recording using the audio field with questionId and idempotencyKey.",
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return error;
  }

  return new AppError(
    "AUDIO_UPLOAD_FAILED",
    "Voice recording could not be uploaded.",
  );
}

function hasSupportedSignature(buffer, mimeType) {
  if (mimeType === "audio/webm") {
    return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }

  if (mimeType === "audio/ogg" || mimeType === "audio/opus") {
    return buffer.subarray(0, 4).toString("ascii") === "OggS";
  }

  if (mimeType === "audio/mp4") {
    return (
      buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp"
    );
  }

  return false;
}

export async function validateUploadedAudio(file) {
  if (!file?.path || !file.size) {
    throw new AppError(
      "INVALID_AUDIO_UPLOAD",
      "Choose one non-empty voice recording.",
      { status: 400 },
    );
  }

  const mimeType = normalizeMimeType(file.mimetype);
  const extension = extname(file.originalname).toLowerCase();
  const audio = await readFile(file.path);

  if (
    !supportedAudioMimeTypes.has(mimeType) ||
    !extensionByMimeType.get(mimeType)?.has(extension) ||
    !hasSupportedSignature(audio, mimeType)
  ) {
    throw unsupportedAudioError();
  }

  return { audio, mimeType };
}

export async function removeUploadedAudio(file) {
  if (file?.path) {
    await rm(file.path, { force: true });
  }
}

export function createAudioUpload({ audioUploadDir, maxAudioSizeBytes }) {
  const upload = multer({
    fileFilter(_request, file, callback) {
      const mimeType = normalizeMimeType(file.mimetype);
      const extension = extname(file.originalname).toLowerCase();
      const isSupported =
        supportedAudioMimeTypes.has(mimeType) &&
        extensionByMimeType.get(mimeType)?.has(extension);

      callback(isSupported ? null : unsupportedAudioError(), isSupported);
    },
    limits: {
      fields: 2,
      fileSize: maxAudioSizeBytes,
      files: 1,
      parts: 3,
    },
    storage: multer.diskStorage({
      destination(_request, _file, callback) {
        mkdir(audioUploadDir, { recursive: true }).then(
          () => callback(null, audioUploadDir),
          callback,
        );
      },
      filename(_request, file, callback) {
        const mimeType = normalizeMimeType(file.mimetype);
        const extension =
          mimeType === "audio/mp4"
            ? ".mp4"
            : [...extensionByMimeType.get(mimeType)][0];
        callback(null, `${randomUUID()}${extension}`);
      },
    }),
  }).single("audio");

  return (request, response, next) => {
    upload(request, response, (error) => {
      if (!error) {
        next();
        return;
      }

      removeUploadedAudio(request.file)
        .catch(() => undefined)
        .finally(() => next(toUploadError(error)));
    });
  };
}
