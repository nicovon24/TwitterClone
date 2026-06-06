import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface AuthResult {
  accessToken: string;
  user: { id: string; username: string };
}

async function registerAndLogin(username: string): Promise<AuthResult> {
  const res = await request(app)
    .post('/auth/register')
    .send({
      username,
      email: `${username}@example.com`,
      password: 'password123',
    });
  return res.body as AuthResult;
}

// ---------------------------------------------------------------------------
// GET /search/users
// ---------------------------------------------------------------------------

describe('GET /search/users', () => {
  it('returns users whose username starts with the query prefix', async () => {
    const alice = await registerAndLogin('srchnico');
    const viewer = await registerAndLogin('srchviewer');

    const res = await request(app)
      .get('/search/users?q=srchni')
      .set('Authorization', `Bearer ${viewer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0]).toMatchObject({ username: alice.user.username });
  });

  it('is case-insensitive (ILIKE) — uppercase query matches lowercase username', async () => {
    await registerAndLogin('srchcasetest');
    const viewer = await registerAndLogin('srchcaseviewer');

    const res = await request(app)
      .get('/search/users?q=SRCHCASE')
      .set('Authorization', `Bearer ${viewer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty users array when no match', async () => {
    const viewer = await registerAndLogin('srchempty');

    const res = await request(app)
      .get('/search/users?q=zzznomatch')
      .set('Authorization', `Bearer ${viewer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ users: [], next_cursor: null });
  });

  it('returns 400 when q param is missing', async () => {
    const viewer = await registerAndLogin('srchnoparam');

    const res = await request(app)
      .get('/search/users')
      .set('Authorization', `Bearer ${viewer.accessToken}`);

    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/search/users?q=test');
    expect(res.status).toBe(401);
  });
});
