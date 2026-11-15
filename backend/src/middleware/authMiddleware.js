import { can } from '../config/permissions.js';
import { prisma } from '../config/db.js';
import {
  extractTokenFromRequest,
  sanitizeDispatcher,
  verifyDispatcherToken,
} from '../services/authService.js';

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
 * RBAC guard. Use after requireDispatcherAuth. Responds 403 FORBIDDEN (not 401)
 * so the client can tell "who are you?" apart from "you may not do this".
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.dispatcher) {
      return res.status(401).json({ error: 'Dispatcher authentication required', code: 'AUTH_REQUIRED' });
    }
    if (!can(req.dispatcher.role, permission)) {
      console.warn(
        `[rbac] denied ${permission} to ${req.dispatcher.username} (${req.dispatcher.role}) on ${req.method} ${req.originalUrl}`
      );
      return res.status(403).json({
        error: 'Your role does not allow this action',
        code: 'FORBIDDEN',
        details: { required: permission, role: req.dispatcher.role },
      });
    }
    return next();
  };
}
