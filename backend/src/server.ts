import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';

import { registerRealtime } from './modules/realtime/gateway.js';
import { healthRouter } from './shared/health.js';

const PORT = Number(process.env.PORT || 4000);
const SOCKET_CORS_ORIGIN = process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dndtable';

async function main() {
  await mongoose.connect(MONGODB_URI);

  const app = express();
  app.use(cors({ origin: SOCKET_CORS_ORIGIN, credentials: true }));
  app.use(express.json());

  app.use('/health', healthRouter);

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: SOCKET_CORS_ORIGIN, methods: ['GET', 'POST'] }
  });

  registerRealtime(io);

  httpServer.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error starting server:', err);
  process.exit(1);
});


