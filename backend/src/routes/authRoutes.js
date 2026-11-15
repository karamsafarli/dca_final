import { Router } from 'express';
import { z } from 'zod';
import { AUTH_COOKIE_NAME } from '../config/constants.js';
import { requireDispatcherAuth } from '../middleware/authMiddleware.js';
import { createLoginLimiter } from '../middleware/rateLimits.js';
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
  createLoginLimiter(),
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.validatedBody;
    const { dispatcher, token } = await authenticateDispatcher(username, password);
    // The JWT lives only in the HttpOnly cookie; never expose it to page scripts.
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    res.json({ dispatcher });
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
