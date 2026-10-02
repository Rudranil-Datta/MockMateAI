import { randomUUID } from "node:crypto";

const safeRequestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

function getRequestId(request) {
  const suppliedRequestId = request.get("x-request-id");
  return safeRequestIdPattern.test(suppliedRequestId || "")
    ? suppliedRequestId
    : randomUUID();
}

export function requestLogger(request, response, next) {
  const requestId = getRequestId(request);
  const startedAt = process.hrtime.bigint();

  request.requestId = requestId;
  response.set("x-request-id", requestId);

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.info("API request completed.", {
      requestId,
      method: request.method,
      path: request.path,
      status: response.statusCode,
      durationMs: Math.round(durationMs),
    });
  });

  next();
}
