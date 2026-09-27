export function createMockTranscriptionProvider() {
  return {
    async transcribeAudio() {
      return { text: "This is a transcribed interview answer." };
    },
  };
}
