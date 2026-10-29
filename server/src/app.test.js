import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './app.js';

describe('LetShop API', () => {
  it('reports service health without a database connection', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('rejects unauthenticated admin access', async () => {
    const response = await request(app).get('/api/admin/stats');
    expect(response.status).toBe(401);
  });
});
