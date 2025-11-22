import dotenv from "dotenv";
dotenv.config();

import 'dotenv/config';
import 'express-async-errors'; // ✅ ДОБАВЛЕНО - должен быть первым!
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';

import { registerRealtime } from './modules/realtime/gateway.js';
import { healthRouter } from './shared/health.js';
import { errorHandler } from './shared/errorHandler.js'; // ✅ ДОБАВЛЕНО
import authRouter from './modules/auth/auth.router';// ✅ ДОБАВЛЕНО

const PORT = Number(process.env.PORT || 4000);
const SOCKET_CORS_ORIGIN = process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dndtable';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB'); // ✅ УЛУЧШЕНО: добавлено подтверждение

  const app = express();
  
  // Middleware (улучшенный порядок)
  app.use(cors({ origin: SOCKET_CORS_ORIGIN, credentials: true }));
  app.use(express.json()); // ✅ ЛУЧШЕ чем bodyParser для Express 4.16+
  
  // ✅ ДОБАВЛЕНО: Auth routes
  app.use('/auth', authRouter);

  //app.use("/auth", authRouter);
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