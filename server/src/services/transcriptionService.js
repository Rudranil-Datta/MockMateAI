import { AppError } from "../utils/AppError.js";
import { createGeminiTranscriptionProvider } from "./geminiTranscriptionProvider.js";
import { createMockTranscriptionProvider } from "./mockTranscriptionProvider.js";

export const supportedAudioMimeTypes = new Set([
  "audio/mp4",
  "audio/ogg",
  "audio/opus",
  "audio/webm",
]);

const maxTranscriptLength = 10_000;

function hasUnsafeControlCharacters(text) {
  return [...text].some((character) => {
    const code = character.charCodeAt(0);
    return (
      code <= 8 ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      code === 127
    );
  });
}

function getErrorChain(error) {
  const chain = [];
  const seen = new Set();
  let current = error;

  while (current && typeof current === "object" && chain.length < 4) {
    if (seen.has(current)) {
      break;
    }
    seen.add(current);
    chain.push(current);
    current = current.cause;
  }

  return chain;
}

function hasErrorSignal(chain, predicate) {
  return chain.some((error) => predicate(error));
}

function normalizeTranscriptionError(error) {
  if (error instanceof AppError) {
    return error;
  }

  const chain = getErrorChain(error);
  const hasStatus = (status) =>
    hasErrorSignal(
      chain,
      (item) => Number(item.status ?? item.statusCode) === status,
    );

  if (
    hasStatus(429) ||
    hasErrorSignal(
      chain,
      (item) =>
        item.code === 429 ||
        item.code === "RESOURCE_EXHAUSTED" ||
        /RESOURCE_EXHAUSTED|quota/i.test(item.message || ""),
    )
  ) {
    return new AppError(
      "AI_QUOTA_EXCEEDED",
      "Voice transcription is temporarily unavailable. Your typed answer is still available; try again later.",
      { expose: true, status: 429 },
    );
  }

  if (
    hasErrorSignal(
      chain,
      (item) =>
        item.name === "AbortError" ||
        item.name === "TimeoutError" ||
        item.code === "ETIMEDOUT" ||
        item.code === "UND_ERR_CONNECT_TIMEOUT",
    )
  ) {
    return new AppError(
      "TRANSCRIPTION_TIMEOUT",
      "Voice transcription took too long. Retry with a short recording or type instead.",
      { expose: true, status: 504 },
    );
  }

  if (hasStatus(400) || hasStatus(415)) {
    return new AppError(
      "TRANSCRIPTION_PROVIDER_REJECTED",
      "Voice transcription rejected this recording. Retry with a new recording or type instead.",
      { expose: true, status: 502 },
    );
  }

  if (hasStatus(401) || hasStatus(403) || hasStatus(404)) {
    return new AppError(
      "TRANSCRIPTION_PROVIDER_CONFIGURATION_ERROR",
      "Voice transcription is temporarily unavailable. Type your answer or try again later.",
      { expose: true, status: 502 },
    );
  }

  if (
    hasErrorSignal(chain, (item) =>
      [
        "EAI_AGAIN",
        "ECONNREFUSED",
        "ECONNRESET",
        "ENETUNREACH",
        "ENOTFOUND",
      ].includes(item.code),
    )
  ) {
    return new AppError(
      "TRANSCRIPTION_NETWORK_ERROR",
      "Voice transcription could not reach the provider. Retry or type your answer instead.",
      { expose: true, status: 502 },
    );
  }

  if (
    hasErrorSignal(chain, (item) => {
      const status = Number(item.status ?? item.statusCode);
      return status >= 500 && status <= 599;
    })
  ) {
    return new AppError(
      "TRANSCRIPTION_PROVIDER_UNAVAILABLE",
      "Voice transcription provider is temporarily unavailable. Retry or type your answer instead.",
      { expose: true, status: 502 },
    );
  }

  return new AppError(
    "TRANSCRIPTION_UNAVAILABLE",
    "Voice transcription is temporarily unavailable. Retry or type your answer instead.",
    { expose: true, status: 502 },
  );
}

function validateTranscript(output) {
  const text = typeof output?.text === "string" ? output.text.trim() : "";

  if (
    !text ||
    text.length > maxTranscriptLength ||
    hasUnsafeControlCharacters(text)
  ) {
    throw new AppError(
      "UNUSABLE_TRANSCRIPTION",
      "No usable speech was found. Retry with a short, clear recording or type instead.",
      { expose: true, status: 422 },
    );
  }

  return { text };
}

export function createTranscriptionService({
  aiProvider = "mock",
  geminiApiKey,
  geminiTranscriptionModel = "gemini-3.6-flash",
  generateContent,
  timeoutMs = 8000,
} = {}) {
  if (!supportedAudioMimeTypes.has("audio/mp4")) {
    throw new Error("MP4 transcription support must remain configured.");
  }

  const provider =
    aiProvider === "mock"
      ? createMockTranscriptionProvider()
      : createGeminiTranscriptionProvider({
          geminiApiKey,
          generateContent,
          model: geminiTranscriptionModel,
          timeoutMs,
        });

  if (aiProvider !== "mock" && !geminiApiKey && !generateContent) {
    throw new AppError(
      "TRANSCRIPTION_PROVIDER_NOT_CONFIGURED",
      "Voice transcription provider is not configured.",
    );
  }

  return {
    async transcribe({ audio, mimeType }) {
      if (
        !Buffer.isBuffer(audio) ||
        audio.length === 0 ||
        !supportedAudioMimeTypes.has(mimeType)
      ) {
        throw new AppError(
          "INVALID_AUDIO_INPUT",
          "Choose a supported non-empty voice recording.",
          { status: 400 },
        );
      }

      try {
        return validateTranscript(
          await provider.transcribeAudio({ audio, mimeType }),
        );
      } catch (error) {
        throw normalizeTranscriptionError(error);
      }
    },
  };
}
