import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import session from "express-session";
import MongoStore from "connect-mongo";

import { registerRealtime } from './modules/realtime/gateway.js';
import { healthRouter } from './shared/health.js';
import { errorHandler } from './shared/errorHandler.js';
import authRouter from './modules/auth/auth.router';
import gamesessionsRouter from './modules/gamesessions/gamesessions.router';
import accessRouter from './modules/access/access.router.js';
import usersRouter from './modules/users/users.router.js';
import friendsRouter from './modules/friends/friends.router.js';
import inboxRouter from './modules/inbox/inbox.router.js';
import sessionInvitesRouter from './modules/gamesessions/session-invites/session-invites.router.js';
import adminRouter from './modules/admin/admin.router.js';
import { FriendCodeGenerator } from './modules/users/FriendCodeGenerator.js';
import { setIoInstance } from "./shared/io.js";
import { AVATARS_DIR } from "./modules/users/avatarUpload.js";
import { SESSION_SPRITES_DIR } from "./modules/gamesessions/session-sprites/sessionSpriteUpload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 4000);
const SOCKET_CORS_ORIGIN = process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dndtable';
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_session_secret_change_me";
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "dnd.sid";
const SESSION_MAX_AGE_MS = Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 7);
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const TRUST_PROXY = process.env.TRUST_PROXY === "1" || IS_PRODUCTION;
const SERVE_STATIC = process.env.SERVE_STATIC === "true";

const REPO_ROOT = path.resolve(__dirname, "../..");
const STATIC_DIR = process.env.STATIC_DIR || path.join(REPO_ROOT, "frontend", "dist");

const API_PATH_PREFIXES = ["/auth", "/api", "/health", "/avatars", "/session-sprites", "/socket.io"];

function maskMongoUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = "***";
    if (parsed.username) parsed.username = "***";
    return parsed.toString();
  } catch {
    return "[mongodb]";
  }
}

function registerStaticFrontend(app: express.Application) {
  app.use(express.static(STATIC_DIR, { index: false }));

  app.get("*", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (API_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))) return next();
    res.sendFile(path.join(STATIC_DIR, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");
  await FriendCodeGenerator.backfillMissing();

  const app = express();

  if (TRUST_PROXY) {
    app.set("trust proxy", 1);
  }

  app.use(cors({ origin: SOCKET_CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  const staticCors: express.RequestHandler = (_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", SOCKET_CORS_ORIGIN);
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  };
  app.use("/avatars", staticCors, express.static(AVATARS_DIR));
  app.use("/session-sprites", staticCors, express.static(SESSION_SPRITES_DIR));

  const sessionMiddleware = session({
    name: SESSION_COOKIE_NAME,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
      collectionName: "sessions",
      stringify: false,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: IS_PRODUCTION,
      maxAge: SESSION_MAX_AGE_MS,
    },
  });
  app.use(sessionMiddleware);

  app.use('/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/friends', friendsRouter);
  app.use('/api/inbox', inboxRouter);
  app.use('/api/sessions', gamesessionsRouter);
  app.use('/api/sessions/:id/invites', sessionInvitesRouter);
  app.use('/api/sessions/:id/access', accessRouter);
  app.use('/api/admin', adminRouter);
  app.use('/health', healthRouter);

  if (SERVE_STATIC) {
    registerStaticFrontend(app);
  }

  app.use(errorHandler);

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: SOCKET_CORS_ORIGIN, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 10 * 1024 * 1024,
  });

  setIoInstance(io);
  registerRealtime(io, sessionMiddleware);

  httpServer.listen(PORT, () => {
    console.log(`DnD Backend listening on port ${PORT}`);
    console.log("Socket.IO ready for connections");
    console.log(`Session sprites dir: ${SESSION_SPRITES_DIR}`);
    console.log(`MongoDB: ${IS_PRODUCTION ? maskMongoUri(MONGODB_URI) : MONGODB_URI}`);
    if (SERVE_STATIC) {
      console.log(`Serving frontend static files from ${STATIC_DIR}`);
    }
  });
}

main().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
