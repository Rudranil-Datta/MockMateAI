import { randomUUID } from "node:crypto";

const safeRequestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;
const requestFailureLogged = Symbol("requestFailureLogged");
const requestLogPath = Symbol("requestLogPath");
const requestStartedAt = Symbol("requestStartedAt");

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
  Object.defineProperty(request, requestLogPath, {
    configurable: false,
    enumerable: false,
    value: request.path,
    writable: false,
  });
  Object.defineProperty(request, requestStartedAt, {
    configurable: false,
    enumerable: false,
    value: startedAt,
    writable: false,
  });
  response.set("x-request-id", requestId);

  response.on("finish", () => {
    if (request[requestFailureLogged]) {
      return;
    }

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.info("API request completed.", {
      requestId,
      method: request.method,
      path: request[requestLogPath],
      status: response.statusCode,
      durationMs: Math.round(durationMs),
    });
  });

  next();
}

export function getRequestLogPath(request) {
  return request?.[requestLogPath] || request?.path;
}

export function markRequestFailureLogged(request) {
  Object.defineProperty(request, requestFailureLogged, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  });
}

export function getRequestDurationMs(request) {
  const startedAt = request?.[requestStartedAt];

  if (typeof startedAt !== "bigint") {
    return 0;
  }

  const durationNanoseconds = process.hrtime.bigint() - startedAt;
  if (durationNanoseconds <= 0n) {
    return 0;
  }

  return Math.round(Number(durationNanoseconds) / 1_000_000);
}
