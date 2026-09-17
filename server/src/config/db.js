import mongoose from "mongoose";

const connectionTimeoutMs = 5000;

export async function connectToDatabase(mongoUri) {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: connectionTimeoutMs,
    });
  } catch (error) {
    console.error("Database connection failed.", { name: error.name });
    throw new Error("Database connection failed.");
  }
}

export async function disconnectFromDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
