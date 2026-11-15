import 'dotenv/config';
import http from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { AUTH_COOKIE_NAME, FRONTEND_ORIGIN, PORT } from './config/constants.js';
import { prisma } from './config/db.js';
import { ensureDatabaseSeeded } from './db/bootstrap.js';
import {
  parseCookieValue,
  verifyDispatcherToken,
} from './services/authService.js';

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN === '*' ? true : FRONTEND_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  const cookieToken = parseCookieValue(
    socket.handshake.headers?.cookie,
    AUTH_COOKIE_NAME
  );
  const authToken = socket.handshake.auth?.token || cookieToken;
  const dispatcherPayload = verifyDispatcherToken(authToken);

  if (dispatcherPayload?.sub) {
    socket.data.dispatcher = dispatcherPayload;
    socket.join('dispatchers');
  }

  socket.emit('connected', {
    timestamp: new Date().toISOString(),
    authenticatedDispatcher: Boolean(dispatcherPayload?.sub),
  });
});

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
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
