import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll } from "vitest";

import User from "../../src/models/User.js";
import InterviewSession from "../../src/models/InterviewSession.js";

export default function useMongoTestDatabase() {
  let mongoServer;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-for-isolated-session-tests";
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await User.init();
  });

  afterEach(async () => {
    await InterviewSession.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer?.stop();
  });
}
