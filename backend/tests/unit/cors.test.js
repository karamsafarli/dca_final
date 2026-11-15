import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { parseAllowedOrigins } from '../../src/config/constants.js';

describe('CORS policy', () => {
  const app = createApp();

  it('does not grant credentialed access to arbitrary origins', async () => {
    const res = await request(app)
      .options('/api/zones')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows the configured frontend origin', async () => {
    const res = await request(app)
      .options('/api/zones')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('ignores a wildcard and falls back to safe local defaults', () => {
    expect(parseAllowedOrigins('*')).toEqual(['http://localhost:3000', 'http://localhost:5173']);
    expect(parseAllowedOrigins(' https://a.az , https://b.az ')).toEqual([
      'https://a.az',
      'https://b.az',
    ]);
  });
});
