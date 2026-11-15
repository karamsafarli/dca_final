import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME, JWT_EXPIRES_IN, JWT_SECRET } from '../config/constants.js';
import { prisma } from '../config/db.js';

const SCRYPT_KEYLEN = 64;

/**
 * Hash a password using scrypt with a unique random 16-byte salt.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * Constant-time scrypt password verification.
 */
export function verifyPassword(password, storedHash) {
  if (!password || !storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;

  const expectedBuf = Buffer.from(keyHex, 'hex');
  const actualBuf = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  if (expectedBuf.length !== actualBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Sign an HS256 JWT for an authenticated dispatcher.
 */
export function signDispatcherToken(dispatcher) {
  return jwt.sign(
    {
      sub: dispatcher.id,
      username: dispatcher.username,
      badgeCode: dispatcher.badgeCode,
      role: dispatcher.role,
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

/**
 * Verify a dispatcher JWT and return its decoded payload or null.
 */
export function verifyDispatcherToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

/**
 * Parse a cookie value by name from a raw Cookie header string.
 */
export function parseCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return null;
}

/**
 * Strip sensitive fields from dispatcher database record.
 */
export function sanitizeDispatcher(dispatcher) {
  if (!dispatcher) return null;
  return {
    id: dispatcher.id,
    username: dispatcher.username,
    fullName: dispatcher.fullName,
    badgeCode: dispatcher.badgeCode,
    role: dispatcher.role,
    isActive: dispatcher.isActive,
    lastLoginAt: dispatcher.lastLoginAt,
  };
}

/**
 * Authenticate dispatcher credentials and return sanitized profile + JWT.
 */
export async function authenticateDispatcher(username, password) {
  const normalized = username.trim().toLowerCase();
  const dispatcher = await prisma.dispatcher.findUnique({
    where: { username: normalized },
  });

  if (!dispatcher || !dispatcher.isActive) {
    const err = new Error('İstifadəçi adı və ya şifrə yanlışdır');
    err.statusCode = 401;
    throw err;
  }

  const valid = verifyPassword(password, dispatcher.passwordHash);
  if (!valid) {
    const err = new Error('İstifadəçi adı və ya şifrə yanlışdır');
    err.statusCode = 401;
    throw err;
  }

  const updated = await prisma.dispatcher.update({
    where: { id: dispatcher.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signDispatcherToken(updated);
  return {
    dispatcher: sanitizeDispatcher(updated),
    token,
  };
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  };
}

export function extractTokenFromRequest(req) {
  if (req.cookies?.[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}
