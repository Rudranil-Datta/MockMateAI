export function notFoundHandler(request, _response, next) {
  const error = new Error("Route not found.");
  error.status = 404;
  error.code = "NOT_FOUND";
  next(error);
}

export function errorHandler(error, request, response, _next) {
  const isMalformedJson = error.type === "entity.parse.failed";
  const isPayloadTooLarge = error.type === "entity.too.large";
  const status = isMalformedJson
    ? 400
    : isPayloadTooLarge
      ? 413
      : Number.isInteger(error.status)
        ? error.status
        : 500;
  const code = isMalformedJson
    ? "MALFORMED_JSON"
    : typeof error.code === "string"
      ? error.code
      : isPayloadTooLarge
        ? "PAYLOAD_TOO_LARGE"
        : "INTERNAL_SERVER_ERROR";
  const message = isMalformedJson
    ? "Request body must contain valid JSON."
    : status >= 500 && !error.expose
      ? "Something went wrong. Please try again later."
      : isPayloadTooLarge
        ? "Request is too large."
        : error.message;

  console.error("API request failed.", {
    requestId: request.requestId,
    method: request.method,
    path: request.path,
    status,
    code,
    errorName: error.name,
  });

  response.status(status).json({
    error: {
      code,
      ...(error.fields ? { fields: error.fields } : {}),
      message,
    },
  });
}
