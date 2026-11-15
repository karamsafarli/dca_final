import 'dotenv/config';
import http from 'node:http';
import { createApp } from './app.js';
import { PORT } from './config/constants.js';
import { prisma } from './config/db.js';
import { ensureDatabaseSeeded } from './db/bootstrap.js';
import { attachRealtime } from './realtime/socketServer.js';

const app = createApp();
const server = http.createServer(app);
const io = attachRealtime(server);
app.set('io', io);

async function start() {
  try {
    await prisma.$connect();
    await ensureDatabaseSeeded();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Urban Crisis Backend listening on port ${PORT} (Node ${process.version})`);
    });
  } catch (err) {
    console.error('Failed to start backend server:', err);
    process.exit(1);
  }
}

start();

async function shutdown(signal) {
  console.log(`Received ${signal}, closing server...`);
  io.close();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
