import { randomUUID } from "node:crypto";

export function requestLogger(request, response, next) {
  const requestId = request.get("x-request-id") || randomUUID();
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
