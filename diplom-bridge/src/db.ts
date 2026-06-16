import mongoose from "mongoose";
import { config } from "./config.js";

let connection: mongoose.Connection | null = null;

export async function connectDb(): Promise<mongoose.Connection> {
  if (connection) return connection;
  connection = mongoose.createConnection(config.mongoUri);
  await connection.asPromise();
  return connection;
}

export async function disconnectDb(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
  }
}

export function usersCollection() {
  if (!connection) throw new Error("MongoDB не подключена");
  return connection.collection("users");
}

export function sessionsCollection() {
  if (!connection) throw new Error("MongoDB не подключена");
  return connection.collection("gamesessions");
}

export function participantsCollection() {
  if (!connection) throw new Error("MongoDB не подключена");
  return connection.collection("session_participants");
}

export function teamsCollection() {
  if (!connection) throw new Error("MongoDB не подключена");
  return connection.collection("teams");
}

export function teamMembersCollection() {
  if (!connection) throw new Error("MongoDB не подключена");
  return connection.collection("team_user_members");
}
