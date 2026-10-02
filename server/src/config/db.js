import mongoose from "mongoose";

const connectionTimeoutMs = 5000;

export async function connectToDatabase(mongoUri, { dbName } = {}) {
  try {
    await mongoose.connect(mongoUri, {
      dbName,
      serverSelectionTimeoutMS: connectionTimeoutMs,
    });
  } catch (error) {
    console.error("Database connection failed.", { name: error.name });
    throw new Error("Database connection failed.");
  }
}

export async function checkDatabaseReadiness({
  connection = mongoose.connection,
  timeoutMs = 1000,
} = {}) {
  if (connection.readyState !== 1 || !connection.db) {
    return false;
  }

  let timeoutId;
  try {
    const result = await Promise.race([
      connection.db.command({ ping: 1 }, { timeoutMS: timeoutMs }),
      new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve(undefined), timeoutMs);
      }),
    ]);

    return result?.ok === 1;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function disconnectFromDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
