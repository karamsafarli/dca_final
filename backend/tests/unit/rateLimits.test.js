import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createLoginLimiter, createSosLimiter } from '../../src/middleware/rateLimits.js';

function appWith(limiter, status = 201) {
  const app = express();
  app.post('/x', limiter, (_req, res) => res.status(status).json({ ok: true }));
  return app;
}

describe('Rate limits', () => {
  it('rejects SOS floods from one client with HTTP 429 RATE_LIMITED', async () => {
    const app = appWith(createSosLimiter({ limit: 3 }));
    for (let i = 0; i < 3; i += 1) expect((await request(app).post('/x')).status).toBe(201);
    const res = await request(app).post('/x');
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMITED');
  });

  it('counts only failed logins toward the lockout', async () => {
    const ok = appWith(createLoginLimiter({ limit: 2 }), 200);
    for (let i = 0; i < 5; i += 1) expect((await request(ok).post('/x')).status).toBe(200);

    const failing = appWith(createLoginLimiter({ limit: 2 }), 401);
    await request(failing).post('/x');
    await request(failing).post('/x');
    expect((await request(failing).post('/x')).status).toBe(429);
  });
});
