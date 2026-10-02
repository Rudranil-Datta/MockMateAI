import { describe, expect, it, vi } from "vitest";

import { checkDatabaseReadiness } from "../../src/config/db.js";

describe("checkDatabaseReadiness", () => {
  it("requires a connected database and a successful ping", async () => {
    const command = vi.fn().mockResolvedValue({ ok: 1 });

    await expect(
      checkDatabaseReadiness({
        connection: { db: { command }, readyState: 1 },
        timeoutMs: 50,
      }),
    ).resolves.toBe(true);
    await expect(
      checkDatabaseReadiness({
        connection: { db: undefined, readyState: 0 },
        timeoutMs: 50,
      }),
    ).resolves.toBe(false);
    expect(command).toHaveBeenCalledWith({ ping: 1 }, { timeoutMS: 50 });
  });

  it("returns unavailable on failure or timeout without exposing details", async () => {
    await expect(
      checkDatabaseReadiness({
        connection: {
          db: { command: vi.fn().mockRejectedValue(new Error("private URI")) },
          readyState: 1,
        },
        timeoutMs: 10,
      }),
    ).resolves.toBe(false);
    await expect(
      checkDatabaseReadiness({
        connection: {
          db: { command: vi.fn(() => new Promise(() => {})) },
          readyState: 1,
        },
        timeoutMs: 10,
      }),
    ).resolves.toBe(false);
  });
});
