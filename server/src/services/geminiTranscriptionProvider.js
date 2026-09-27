import { GoogleGenAI } from "@google/genai";

export function createGeminiTranscriptionProvider({
  geminiApiKey,
  generateContent,
  model,
  timeoutMs,
}) {
  const client = generateContent
    ? null
    : new GoogleGenAI({ apiKey: geminiApiKey });
  const requestContent =
    generateContent || ((request) => client.models.generateContent(request));

  return {
    async transcribeAudio({ audio, mimeType }) {
      const response = await requestContent({
        config: {
          abortSignal: AbortSignal.timeout(timeoutMs),
          candidateCount: 1,
          maxOutputTokens: 3000,
          temperature: 0,
          thinkingConfig: { thinkingBudget: 0 },
        },
        contents: [
          {
            text: "Transcribe only the spoken words in this interview-practice answer. Return plain text only. Do not add commentary, formatting, timestamps, speaker labels, or an answer of your own.",
          },
          {
            inlineData: {
              data: audio.toString("base64"),
              mimeType,
            },
          },
        ],
        model,
      });

      return { text: response?.text };
    },
  };
}
