import { prisma } from '../config/db.js';
import {
  extractTokenFromRequest,
  sanitizeDispatcher,
  verifyDispatcherToken,
} from '../services/authService.js';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;
const loginAttempts = new Map();

/**
 * Require valid authenticated dispatcher JWT (cookie or Bearer token).
 */
export async function requireDispatcherAuth(req, res, next) {
  try {
    const token = extractTokenFromRequest(req);
    const payload = verifyDispatcherToken(token);

    if (!payload?.sub) {
      return res.status(401).json({
        error: 'Dispatcher authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const dispatcher = await prisma.dispatcher.findUnique({
      where: { id: Number(payload.sub) },
    });

    if (!dispatcher || !dispatcher.isActive) {
      return res.status(401).json({
        error: 'Session is invalid or the account is deactivated',
        code: 'SESSION_INVALID',
      });
    }

    req.dispatcher = sanitizeDispatcher(dispatcher);
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Simple in-memory brute-force protection for dispatcher login attempts.
 */
export function checkLoginRateLimit(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (entry && entry.resetAt > now && entry.count >= MAX_FAILED_ATTEMPTS) {
    return res.status(429).json({
      error: 'Too many failed login attempts. Try again in a few minutes.',
      code: 'RATE_LIMITED',
    });
  }

  return next();
}

export function recordLoginFailure(ip) {
  const key = ip || 'unknown';
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearLoginFailures(ip) {
  loginAttempts.delete(ip || 'unknown');
}
