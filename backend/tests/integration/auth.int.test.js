import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { resetDatabase } from '../helpers/testContext.js';

const app = createApp();
beforeAll(resetDatabase);

describe('Dispatcher login', () => {
  it('sets an HttpOnly cookie and never returns the JWT in the response body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dispatcher1', password: process.env.SEED_DISPATCHER_PASSWORD || 'Fhn112!Crisis' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeUndefined();
    expect(res.body.dispatcher.username).toBe('dispatcher1');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/crisis_dispatcher_token=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);

    const me = await request(app).get('/api/auth/me').set('Cookie', res.headers['set-cookie']);
    expect(me.status).toBe(200);
  });

  it('rejects a wrong password with a translatable code', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dispatcher1', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });
});
