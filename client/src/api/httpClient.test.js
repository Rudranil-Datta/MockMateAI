import { describe, expect, it, vi } from "vitest";

import { apiRequest, ApiError, healthRequest } from "./httpClient.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("apiRequest", () => {
  it("returns a successful JSON response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ user: { id: "user-1" } }));

    await expect(apiRequest("auth/me", { fetchImpl })).resolves.toEqual({
      user: { id: "user-1" },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/me$/),
      expect.objectContaining({ credentials: "include", method: "GET" }),
    );
  });

  it("preserves documented API errors without raw response details", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: { email: "Invalid email." },
            message: "Check your email.",
          },
        },
        400,
      ),
    );

    await expect(
      apiRequest("auth/signup", { body: {}, fetchImpl, method: "POST" }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { email: "Invalid email." },
      message: "Check your email.",
      status: 400,
    });
  });

  it("returns a safe error for malformed JSON", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("not-json", { status: 200 }));

    await expect(apiRequest("health", { fetchImpl })).rejects.toEqual(
      expect.objectContaining({ code: "UNEXPECTED_RESPONSE" }),
    );
  });

  it("returns a safe error for network failures", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("connection reset"));

    await expect(healthRequest({ fetchImpl })).rejects.toEqual(
      expect.objectContaining({
        code: "NETWORK_ERROR",
        message: expect.stringMatching(/Unable to reach/),
      }),
    );
  });

  it("exposes only safe API error fields", () => {
    const error = new ApiError(
      "REQUEST_FAILED",
      "Request could not be completed.",
      { status: 500 },
    );

    expect(error).toMatchObject({ code: "REQUEST_FAILED", status: 500 });
    expect(error).not.toHaveProperty("cause");
  });
});
