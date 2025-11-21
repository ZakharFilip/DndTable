// backend/storage/index.ts
import mongoose from "mongoose";

export async function connectMongo(uri: string) {
  try {
    await mongoose.connect(uri);
    console.log("📦 MongoDB connected");
  } catch (err) {
    console.error("Mongo connect error:", err);
    process.exit(1);
  }
}


