export function createAnalyticsController({ analyticsService }) {
  return {
    async getSummary(request, response, next) {
      try {
        const analytics = await analyticsService.getSummary({
          userId: request.auth.userId,
        });

        response.status(200).json(analytics);
      } catch (error) {
        next(error);
      }
    },
  };
}
