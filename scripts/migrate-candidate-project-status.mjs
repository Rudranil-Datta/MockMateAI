import "dotenv/config";

import CandidateProject from "../server/src/models/CandidateProject.js";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "../server/src/config/db.js";
import { loadConfig } from "../server/src/config/env.js";
import { validateProjectFacts } from "../server/src/validators/projectSchemas.js";

const apply = process.argv.includes("--apply");
const legacyFilter = { status: { $exists: false } };

try {
  const config = loadConfig();
  await connectToDatabase(config.mongoUri, { dbName: config.mongoDbName });
  const legacy = await CandidateProject.collection.find(legacyFilter).toArray();
  for (const project of legacy) {
    validateProjectFacts({
      architecture: project.architecture,
      claims: project.claims,
      decisions: project.decisions,
      name: project.name,
      responsibilities: project.responsibilities,
      role: project.role,
      summary: project.summary,
      technologies: project.technologies,
      tradeoffs: project.tradeoffs,
    });
    if (!project.confirmedAt)
      throw new Error("Legacy project readiness preflight failed.");
  }
  if (apply && legacy.length) {
    const result = await CandidateProject.collection.updateMany(legacyFilter, {
      $set: { status: "ready" },
    });
    if (result.modifiedCount !== legacy.length)
      throw new Error("Migration count mismatch.");
  }
  console.info("Candidate project status migration complete.", {
    applied: apply,
    eligibleCount: legacy.length,
  });
} finally {
  await disconnectFromDatabase();
}
