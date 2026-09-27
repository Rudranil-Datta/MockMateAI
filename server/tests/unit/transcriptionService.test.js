import { describe, expect, it, vi } from "vitest";

import { createTranscriptionService } from "../../src/services/transcriptionService.js";

describe("transcriptionService", () => {
  it("sends MP4 bytes directly to Gemini and returns trimmed text", async () => {
    const audio = Buffer.from("mp4-audio");
    const generateContent = vi.fn().mockResolvedValue({
      text: "  A concise spoken answer.  ",
    });
    const service = createTranscriptionService({
      aiProvider: "gemini",
      generateContent,
      geminiTranscriptionModel: "test-transcription-model",
      timeoutMs: 1234,
    });

    await expect(
      service.transcribe({ audio, mimeType: "audio/mp4" }),
    ).resolves.toEqual({ text: "A concise spoken answer." });
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.arrayContaining([
          {
            inlineData: {
              data: audio.toString("base64"),
              mimeType: "audio/mp4",
            },
          },
        ]),
        model: "test-transcription-model",
      }),
    );
  });

  it.each([
    [{ text: "" }],
    [{ text: "x".repeat(10_001) }],
    [{ text: "unsafe\u0000text" }],
  ])("rejects unusable provider output", async (providerOutput) => {
    const service = createTranscriptionService({
      aiProvider: "gemini",
      generateContent: vi.fn().mockResolvedValue(providerOutput),
    });

    await expect(
      service.transcribe({
        audio: Buffer.from("audio"),
        mimeType: "audio/mp4",
      }),
    ).rejects.toMatchObject({ code: "UNUSABLE_TRANSCRIPTION", status: 422 });
  });

  it.each([
    [
      Object.assign(new Error("quota"), { status: 429 }),
      "AI_QUOTA_EXCEEDED",
      429,
    ],
    [
      Object.assign(new Error("late"), { name: "TimeoutError" }),
      "TRANSCRIPTION_TIMEOUT",
      504,
    ],
    [new Error("provider secret"), "TRANSCRIPTION_UNAVAILABLE", 502],
    [
      Object.assign(new Error("rejected detail"), { status: 400 }),
      "TRANSCRIPTION_PROVIDER_REJECTED",
      502,
    ],
    [
      Object.assign(new Error("credential detail"), { status: 403 }),
      "TRANSCRIPTION_PROVIDER_CONFIGURATION_ERROR",
      502,
    ],
    [
      Object.assign(new Error("service detail"), { statusCode: 503 }),
      "TRANSCRIPTION_PROVIDER_UNAVAILABLE",
      502,
    ],
    [
      Object.assign(new Error("network detail"), { code: "ECONNRESET" }),
      "TRANSCRIPTION_NETWORK_ERROR",
      502,
    ],
    [
      Object.assign(new Error("wrapper"), {
        cause: Object.assign(new Error("quota detail"), {
          code: "RESOURCE_EXHAUSTED",
        }),
      }),
      "AI_QUOTA_EXCEEDED",
      429,
    ],
  ])(
    "maps provider failures to safe errors",
    async (providerError, code, status) => {
      const service = createTranscriptionService({
        aiProvider: "gemini",
        generateContent: vi.fn().mockRejectedValue(providerError),
      });

      let normalizedError;
      try {
        await service.transcribe({
          audio: Buffer.from("audio"),
          mimeType: "audio/mp4",
        });
      } catch (error) {
        normalizedError = error;
      }

      expect(normalizedError).toMatchObject({ code, status });
      expect(normalizedError.message).not.toMatch(/detail|secret/i);
    },
  );
});
