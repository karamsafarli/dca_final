import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
});

export function reconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
  socket.connect();
}
