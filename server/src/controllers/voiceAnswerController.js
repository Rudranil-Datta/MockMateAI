import {
  removeUploadedAudio,
  validateUploadedAudio,
} from "../middlewares/audioUpload.js";
import {
  validateInterviewId,
  validateVoiceAnswerRequest,
} from "../validators/interviewSchemas.js";

export function createVoiceAnswerController({ voiceAnswerService }) {
  return {
    async preflight(request, _response, next) {
      try {
        await voiceAnswerService.assertOwnedActiveInterview({
          interviewId: validateInterviewId(request.params.id),
          userId: request.auth.userId,
        });
        next();
      } catch (error) {
        next(error);
      }
    },

    async transcribe(request, response, next) {
      try {
        const input = validateVoiceAnswerRequest(request.body);
        const audio = await validateUploadedAudio(request.file);
        const result = await voiceAnswerService.transcribeVoiceAnswer({
          ...audio,
          ...input,
          interviewId: validateInterviewId(request.params.id),
          userId: request.auth.userId,
        });

        await removeUploadedAudio(request.file);
        response.status(200).json(result);
      } catch (error) {
        await removeUploadedAudio(request.file).catch(() => undefined);
        next(error);
      }
    },
  };
}
