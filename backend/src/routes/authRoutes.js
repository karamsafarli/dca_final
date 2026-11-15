import { Router } from 'express';
import { z } from 'zod';
import { AUTH_COOKIE_NAME } from '../config/constants.js';
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginFailure,
  requireDispatcherAuth,
} from '../middleware/authMiddleware.js';
import {
  authenticateDispatcher,
  getAuthCookieOptions,
} from '../services/authService.js';
import { asyncHandler, validateBody } from '../utils/http.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().trim().min(2).max(64),
  password: z.string().min(6).max(128),
});

router.post(
  '/auth/login',
  checkLoginRateLimit,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.validatedBody;
    try {
      const { dispatcher, token } = await authenticateDispatcher(username, password);
      clearLoginFailures(req.ip);
      res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
      res.json({ dispatcher, token });
    } catch (err) {
      if (err.statusCode === 401) {
        recordLoginFailure(req.ip);
      }
      throw err;
    }
  })
);

router.post('/auth/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  res.json({ loggedOut: true });
});

router.get('/auth/me', requireDispatcherAuth, (req, res) => {
  res.json({ dispatcher: req.dispatcher });
});

export default router;
