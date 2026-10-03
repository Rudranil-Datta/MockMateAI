import { EventEmitter } from "node:events";

import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../../src/utils/AppError.js";
import { errorHandler } from "../../src/middlewares/errorHandler.js";
import { requestLogger } from "../../src/middlewares/requestLogger.js";

function createRequest() {
  return {
    get: vi.fn().mockReturnValue(undefined),
    method: "POST",
    path: "/api/interviews",
  };
}

function createResponse() {
  const response = new EventEmitter();
  response.set = vi.fn();
  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);
  response.statusCode = 502;
  return response;
}

describe("request failure logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs only exact safe metadata with rounded duration and category", () => {
    const request = createRequest();
    const response = createResponse();
    const error = new AppError(
      "AI_PROVIDER_UNAVAILABLE",
      "AI practice is temporarily unavailable. Please try again.",
      {
        errorCategory: "provider_permission",
        expose: true,
        status: 502,
      },
    );
    error.cause = new Error("private cause");
    error.rawMessage = "private provider message";
    error.prompt = "private prompt";
    error.resumeContext = "private resume";
    error.providerPayload = { secret: "private payload" };
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const loggedError = vi.spyOn(console, "error").mockImplementation(() => {});
    const times = [1_000_000_000n, 1_012_600_000n, 1_012_600_000n];
    vi.spyOn(process.hrtime, "bigint").mockImplementation(() => times.shift());

    requestLogger(request, response, vi.fn());
    request.path = "/interviews";
    errorHandler(error, request, response, vi.fn());
    response.emit("finish");

    expect(loggedError).toHaveBeenCalledWith("API request failed.", {
      requestId: request.requestId,
      method: "POST",
      path: "/api/interviews",
      status: 502,
      code: "AI_PROVIDER_UNAVAILABLE",
      durationMs: 13,
      errorCategory: "provider_permission",
    });
    expect(Object.keys(loggedError.mock.calls[0][1])).toEqual([
      "requestId",
      "method",
      "path",
      "status",
      "code",
      "durationMs",
      "errorCategory",
    ]);
    expect(JSON.stringify(loggedError.mock.calls[0][1])).not.toMatch(
      /private|message|cause|stack|prompt|resume|payload|header|cookie|errorName/i,
    );
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "AI_PROVIDER_UNAVAILABLE",
        message: "AI practice is temporarily unavailable. Please try again.",
      },
    });
    expect(response.json.mock.calls[0][0]).not.toHaveProperty(
      "error.errorCategory",
    );
    expect(info).not.toHaveBeenCalled();
  });

  it("omits invalid categories and uses zero duration without valid timing", () => {
    const request = createRequest();
    const response = createResponse();
    const error = new AppError("INTERNAL_SERVER_ERROR", "private", {
      errorCategory: "provider_secret_detail",
      status: 500,
    });
    const loggedError = vi.spyOn(console, "error").mockImplementation(() => {});

    errorHandler(error, request, response, vi.fn());

    expect(loggedError).toHaveBeenCalledWith("API request failed.", {
      requestId: undefined,
      method: "POST",
      path: "/api/interviews",
      status: 500,
      code: "INTERNAL_SERVER_ERROR",
      durationMs: 0,
    });
    expect(error).not.toHaveProperty("errorCategory");
  });

  it("logs one successful terminal event with the captured query-free path", () => {
    const request = createRequest();
    request.originalUrl = "/api/interviews?token=private";
    const response = createResponse();
    response.statusCode = 200;
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(process.hrtime, "bigint")
      .mockReturnValueOnce(1_000_000_000n)
      .mockReturnValueOnce(1_003_600_000n);

    requestLogger(request, response, vi.fn());
    request.path = "/interviews";
    response.emit("finish");

    expect(info).toHaveBeenCalledOnce();
    expect(info).toHaveBeenCalledWith("API request completed.", {
      requestId: request.requestId,
      method: "POST",
      path: "/api/interviews",
      status: 200,
      durationMs: 4,
    });
    expect(JSON.stringify(info.mock.calls[0][1])).not.toMatch(
      /private|token|query|header|cookie/i,
    );
  });
});
