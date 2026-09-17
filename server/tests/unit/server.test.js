import { EventEmitter } from "node:events";

import { afterEach, describe, expect, it, vi } from "vitest";

const loadConfig = vi.fn();
const connectToDatabase = vi.fn();
const createApp = vi.fn();
const disconnectFromDatabase = vi.fn();
const listen = vi.fn();

vi.mock("../../src/config/env.js", () => ({ loadConfig }));
vi.mock("../../src/config/db.js", () => ({
  connectToDatabase,
  disconnectFromDatabase,
}));
vi.mock("../../src/app.js", () => ({
  createApp,
}));

const { startServer } = await import("../../src/server.js");

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("startServer", () => {
  it("waits for the database and listening event before resolving", async () => {
    const server = new EventEmitter();
    server.close = vi.fn();
    loadConfig.mockReturnValue({
      mongoUri: "mongodb://localhost/mockmateai",
      port: 4444,
    });
    connectToDatabase.mockResolvedValue();
    createApp.mockReturnValue({ listen });
    listen.mockImplementation(() => {
      queueMicrotask(() => server.emit("listening"));
      return server;
    });

    await expect(startServer()).resolves.toBe(server);
    expect(connectToDatabase).toHaveBeenCalledWith(
      "mongodb://localhost/mockmateai",
    );
    expect(createApp).toHaveBeenCalledWith(
      expect.objectContaining({ port: 4444 }),
    );
    expect(listen).toHaveBeenCalledWith(4444);
  });
});
