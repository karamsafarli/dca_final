import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';

/**
 * Contract: every error response carries a stable machine-readable `code`
 * that the bilingual frontend translates (no Azerbaijani-only server text).
 */
describe('API error contract', () => {
  const app = createApp();

  it.each([
    ['unauthenticated dispatcher call', () => request(app).get('/api/dispatcher/dashboard'), 401, 'AUTH_REQUIRED'],
    ['invalid body', () => request(app).post('/api/citizen/sos').send({ hazardType: 'X' }), 400, 'VALIDATION_ERROR'],
    ['invalid query', () => request(app).get('/api/citizen/evacuation-plan?zoneId=abc'), 400, 'VALIDATION_ERROR'],
    ['unknown route', () => request(app).get('/api/nope'), 404, 'ROUTE_NOT_FOUND'],
  ])('%s → HTTP %i with code %s', async (_label, call, status, code) => {
    const res = await call();
    expect(res.status).toBe(status);
    expect(res.body.code).toBe(code);
    expect(res.body.error).toMatch(/^[\x20-\x7E]+$/); // English ASCII fallback message
  });
});
