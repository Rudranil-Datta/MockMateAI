export function createSkillController({ skillEvidenceService }) {
  return {
    async getProfile(request, response, next) {
      try {
        const profile = await skillEvidenceService.getProfile({
          userId: request.auth.userId,
        });
        response.status(200).json(profile);
      } catch (error) {
        next(error);
      }
    },
  };
}
