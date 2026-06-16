import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.DIPLOM_BRIDGE_PORT ?? 4010),
  bindHost: process.env.DIPLOM_BRIDGE_BIND ?? "0.0.0.0",
  mainApiUrl: (process.env.MAIN_API_URL ?? "http://localhost:4000").replace(/\/$/, ""),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/dndtable",
  serviceEmail: process.env.SERVICE_EMAIL ?? "aisuppurt@bot.bot.bot",
  servicePassword: process.env.SERVICE_PASSWORD ?? "UltraSekretusBotusParolus",
  bridgeApiKey: process.env.DIPLOM_BRIDGE_API_KEY?.trim() || "",
  autoLeaveAfterRequest: process.env.AUTO_LEAVE_AFTER_REQUEST !== "false",
  sessionOwnerSlug: "session-owner",
  bridgeMetaKey: "diplomBridgeElevated",
} as const;
