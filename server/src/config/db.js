import mongoose from "mongoose";

/**
 * Connects to MongoDB using MONGO_URI. If a real MongoDB instance is not
 * reachable within a short timeout (common in local/demo environments
 * without MongoDB installed), we transparently fall back to an in-memory
 * MongoDB instance (mongodb-memory-server) so the app is always demo-ready.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chainverify";

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    console.log(`[DB] Connected to MongoDB at ${uri}`);
    return { mode: "external" };
  } catch (err) {
    console.warn(`[DB] Could not reach ${uri} (${err.message}).`);
    console.warn("[DB] Falling back to in-memory MongoDB for this session...");
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mem = await MongoMemoryServer.create();
    const memUri = mem.getUri("chainverify");
    await mongoose.connect(memUri);
    console.log(`[DB] Connected to in-memory MongoDB at ${memUri}`);
    return { mode: "memory", instance: mem };
  }
}

export default connectDB;
