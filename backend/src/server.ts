import dotenv from "dotenv";
dotenv.config();

import 'dotenv/config';
import 'express-async-errors'; // ✅ ДОБАВЛЕНО - должен быть первым!
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import session from "express-session";
import MongoStore from "connect-mongo";

import { registerRealtime } from './modules/realtime/gateway.js';
import { healthRouter } from './shared/health.js';
import { errorHandler } from './shared/errorHandler.js'; // ✅ ДОБАВЛЕНО
import authRouter from './modules/auth/auth.router';// ✅ ДОБАВЛЕНО
import gamesessionsRouter from './modules/gamesessions/gamesessions.router';

const PORT = Number(process.env.PORT || 4000);
const SOCKET_CORS_ORIGIN = process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dndtable';
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_session_secret_change_me";
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "dnd.sid";
const SESSION_MAX_AGE_MS = Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 7); // 7 days

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB'); // ✅ УЛУЧШЕНО: добавлено подтверждение

  const app = express();
  
  // Middleware (улучшенный порядок)
  app.use(cors({ origin: SOCKET_CORS_ORIGIN, credentials: true }));
  app.use(express.json()); // ✅ ЛУЧШЕ чем bodyParser для Express 4.16+

  app.use(
    session({
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
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_MAX_AGE_MS,
      },
    })
  );
  
  // ✅ ДОБАВЛЕНО: Auth routes
  app.use('/auth', authRouter);

  app.use('/api/sessions', gamesessionsRouter);

  // Health check (оставлен ваш роутер)
  app.use('/health', healthRouter);

  // ✅ ДОБАВЛЕНО: Error handler (должен быть ДО создания httpServer)
  app.use(errorHandler);

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: SOCKET_CORS_ORIGIN, methods: ['GET', 'POST'] }
  });

  registerRealtime(io);

  httpServer.listen(PORT, () => {
    console.log(`🎮 DnD Backend listening on http://localhost:${PORT}`); // ✅ УЛУЧШЕНО
    console.log(`⚡ Socket.IO ready for connections`);
    console.log(`📊 MongoDB: ${MONGODB_URI}`);
  });
}

main().catch((err) => {
  console.error('💥 Fatal error starting server:', err); // ✅ УЛУЧШЕНО
  process.exit(1);
});