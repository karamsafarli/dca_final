import rateLimit from 'express-rate-limit';

const rejected = (code, message) => (_req, res) =>
  res.status(429).json({ error: message, code });

/**
 * Anti-spam for the public one-click SOS endpoint: stops one client from
 * flooding dispatchers or faking Red Alerts (which also need 4 *distinct* citizens).
 */
export function createSosLimiter({
  limit = Number(process.env.SOS_RATE_LIMIT_PER_MIN || 10),
  windowMs = 60 * 1000,
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rejected('RATE_LIMITED', 'Too many SOS requests from this device. Please wait a moment.'),
  });
}

/** Brute-force protection: only failed dispatcher logins count. */
export function createLoginLimiter({
  limit = Number(process.env.LOGIN_FAILED_LIMIT || 10),
  windowMs = 15 * 60 * 1000,
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rejected('RATE_LIMITED', 'Too many failed login attempts. Try again in a few minutes.'),
  });
}
