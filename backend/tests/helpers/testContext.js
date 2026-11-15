import { prisma } from '../../src/config/db.js';
import { seedDatabase } from '../../src/db/seedData.js';
import { signDispatcherToken } from '../../src/services/authService.js';

/** Restore the deterministic Baku seed before each test. */
export async function resetDatabase() {
  await seedDatabase(prisma);
}

/** Bearer header for a seeded dispatcher account. */
export async function dispatcherAuthHeader(username = 'dispatcher1') {
  const dispatcher = await prisma.dispatcher.findUniqueOrThrow({ where: { username } });
  return `Bearer ${signDispatcherToken(dispatcher)}`;
}

/** Minimal Socket.IO stand-in that records every emit and its target room. */
export function createRecordingIo() {
  const events = [];
  const emitter = (room) => ({
    emit: (event, payload) => events.push({ room, event, payload }),
  });
  return {
    events,
    emit: (event, payload) => events.push({ room: '*', event, payload }),
    to: (room) => emitter(room),
  };
}

export { prisma };
