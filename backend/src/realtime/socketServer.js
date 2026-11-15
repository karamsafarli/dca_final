import { Server } from 'socket.io';
import { ALLOWED_ORIGINS, AUTH_COOKIE_NAME } from '../config/constants.js';
import { can } from '../config/permissions.js';
import { parseCookieValue, verifyDispatcherToken } from '../services/authService.js';
import { verifySosAccessToken } from '../services/sosService.js';
import { DISPATCHER_ROOM, citizenSosRoom } from './events.js';

/**
 * Attach Socket.IO to an HTTP server.
 * - Dispatchers (valid JWT via cookie or `auth.token`) join the private dispatcher room.
 * - Citizens may join the private room of their own SOS with `citizen:watch`.
 */
export function attachRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    const cookieToken = parseCookieValue(socket.handshake.headers?.cookie, AUTH_COOKIE_NAME);
    const dispatcherPayload = verifyDispatcherToken(socket.handshake.auth?.token || cookieToken);

    if (dispatcherPayload?.sub && can(dispatcherPayload.role, 'dashboard:read')) {
      socket.data.dispatcher = dispatcherPayload;
      socket.join(DISPATCHER_ROOM);
    }

    socket.on('citizen:watch', async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const sosId = Number(payload?.sosId);
        const ok = await verifySosAccessToken(sosId, payload?.accessToken);
        if (!ok) return reply({ ok: false, code: 'SOS_ACCESS_DENIED' });
        socket.join(citizenSosRoom(sosId));
        return reply({ ok: true });
      } catch {
        return reply({ ok: false, code: 'SOS_ACCESS_DENIED' });
      }
    });

    socket.emit('connected', {
      timestamp: new Date().toISOString(),
      authenticatedDispatcher: Boolean(dispatcherPayload?.sub),
    });
  });

  return io;
}
