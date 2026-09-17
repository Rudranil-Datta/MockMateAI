import "dotenv/config";
import { once } from "node:events";
import { pathToFileURL } from "node:url";

import { createApp } from "./app.js";
import { connectToDatabase, disconnectFromDatabase } from "./config/db.js";
import { loadConfig } from "./config/env.js";

export async function startServer() {
  const config = loadConfig();
  await connectToDatabase(config.mongoUri);

  const server = createApp(config).listen(config.port);
  try {
    await once(server, "listening");
  } catch (error) {
    await disconnectFromDatabase();
    throw error;
  }
  console.info(`MockMateAI API listening on port ${config.port}`);

  const shutdown = async () => {
    server.close(async () => {
      await disconnectFromDatabase();
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  return server;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer().catch((error) => {
    console.error("MockMateAI API failed to start.", { name: error.name });
    process.exitCode = 1;
  });
}
