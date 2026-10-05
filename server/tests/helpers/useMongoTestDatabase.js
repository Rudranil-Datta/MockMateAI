import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll } from "vitest";

import User from "../../src/models/User.js";
import InterviewSession from "../../src/models/InterviewSession.js";
import CandidateProject from "../../src/models/CandidateProject.js";
import JobTarget from "../../src/models/JobTarget.js";
import Resume from "../../src/models/Resume.js";
import SkillEvidence from "../../src/models/SkillEvidence.js";

export default function useMongoTestDatabase() {
  let mongoServer;
  let isExternalTestDatabase = false;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-for-isolated-session-tests";
    const atlasUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
    const atlasDatabaseBaseName = process.env.MONGODB_TEST_DB_NAME;
    const atlasDatabaseName = atlasDatabaseBaseName
      ? `${atlasDatabaseBaseName}_${process.env.VITEST_POOL_ID || process.env.VITEST_WORKER_ID || "0"}`
      : undefined;
    if (atlasUri && atlasDatabaseName) {
      await mongoose.connect(atlasUri, { dbName: atlasDatabaseName });
      isExternalTestDatabase = true;
    } else {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    }
    await User.init();
  });

  afterEach(async () => {
    await InterviewSession.deleteMany({});
    await CandidateProject.deleteMany({});
    await JobTarget.deleteMany({});
    await Resume.deleteMany({});
    await SkillEvidence.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    if (isExternalTestDatabase) {
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
    await mongoServer?.stop();
  });
}
