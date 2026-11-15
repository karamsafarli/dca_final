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
