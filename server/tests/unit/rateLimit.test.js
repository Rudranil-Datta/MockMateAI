import { describe, expect, it, vi } from "vitest";

import { createRateLimit } from "../../src/middlewares/rateLimit.js";

function runMiddleware(middleware, request) {
  const response = { set: vi.fn() };
  const next = vi.fn();

  middleware(request, response, next);

  return { error: next.mock.calls[0]?.[0], next, response };
}

describe("createRateLimit", () => {
  it("allows the configured count and returns a bounded retry time", () => {
    let currentTime = 1_000;
    const middleware = createRateLimit({
      code: "AI_RATE_LIMITED",
      message: "Limit reached.",
      now: () => currentTime,
      rules: [
        {
          key: (request) => request.userId,
          limit: 2,
          name: "user",
          windowMs: 5_000,
        },
      ],
    });

    expect(
      runMiddleware(middleware, { userId: "user-1" }).error,
    ).toBeUndefined();
    expect(
      runMiddleware(middleware, { userId: "user-1" }).error,
    ).toBeUndefined();

    const blocked = runMiddleware(middleware, { userId: "user-1" });
    expect(blocked.error).toMatchObject({
      code: "AI_RATE_LIMITED",
      status: 429,
    });
    expect(blocked.response.set).toHaveBeenCalledWith("Retry-After", "5");

    currentTime = 6_000;
    expect(
      runMiddleware(middleware, { userId: "user-1" }).error,
    ).toBeUndefined();
  });

  it("isolates keys and enforces shared application rules", () => {
    const middleware = createRateLimit({
      code: "AI_RATE_LIMITED",
      message: "Limit reached.",
      now: () => 0,
      rules: [
        {
          key: (request) => request.userId,
          limit: 2,
          name: "user",
          windowMs: 5_000,
        },
        {
          key: () => "application",
          limit: 2,
          name: "application",
          windowMs: 5_000,
        },
      ],
    });

    expect(
      runMiddleware(middleware, { userId: "user-1" }).error,
    ).toBeUndefined();
    expect(
      runMiddleware(middleware, { userId: "user-2" }).error,
    ).toBeUndefined();
    expect(runMiddleware(middleware, { userId: "user-3" }).error).toMatchObject(
      {
        code: "AI_RATE_LIMITED",
      },
    );
  });

  it("fails closed when bounded entry capacity is exhausted", () => {
    const middleware = createRateLimit({
      code: "UPLOAD_RATE_LIMITED",
      maximumEntries: 1,
      message: "Limit reached.",
      now: () => 0,
      rules: [
        {
          key: (request) => request.userId,
          limit: 2,
          name: "user",
          windowMs: 5_000,
        },
      ],
    });

    expect(
      runMiddleware(middleware, { userId: "user-1" }).error,
    ).toBeUndefined();
    expect(
      runMiddleware(middleware, { userId: "user-1" }).error,
    ).toBeUndefined();
    const blocked = runMiddleware(middleware, { userId: "user-2" });
    expect(blocked.error).toMatchObject({ code: "UPLOAD_RATE_LIMITED" });
    expect(blocked.response.set).toHaveBeenCalledWith("Retry-After", "60");
  });
});
