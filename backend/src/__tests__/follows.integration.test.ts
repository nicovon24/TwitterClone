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
// POST /follows/:username
// ---------------------------------------------------------------------------

describe('POST /follows/:username', () => {
  it('follows a valid user → 201', async () => {
    const alice = await registerAndLogin('flalice1');
    const bob = await registerAndLogin('flbob1');

    const res = await request(app)
      .post(`/follows/${bob.user.username}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ message: expect.stringContaining(bob.user.username) });
  });

  it('returns 409 when already following', async () => {
    const alice = await registerAndLogin('flalice2');
    const bob = await registerAndLogin('flbob2');

    await request(app)
      .post(`/follows/${bob.user.username}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    const res = await request(app)
      .post(`/follows/${bob.user.username}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(409);
  });

  it('returns 400 when trying to follow yourself', async () => {
    const alice = await registerAndLogin('flalice3');

    const res = await request(app)
      .post(`/follows/${alice.user.username}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(400);
  });

  it('returns 404 when target user does not exist', async () => {
    const alice = await registerAndLogin('flalice4');

    const res = await request(app)
      .post('/follows/nonexistentuser999')
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /follows/:username
// ---------------------------------------------------------------------------

describe('DELETE /follows/:username', () => {
  it('unfollows a followed user → 200', async () => {
    const alice = await registerAndLogin('flalice5');
    const bob = await registerAndLogin('flbob5');

    await request(app)
      .post(`/follows/${bob.user.username}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    const res = await request(app)
      .delete(`/follows/${bob.user.username}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: expect.stringContaining(bob.user.username) });
  });

  it('returns 400 when not following the user', async () => {
    const alice = await registerAndLogin('flalice6');
    const bob = await registerAndLogin('flbob6');

    const res = await request(app)
      .delete(`/follows/${bob.user.username}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(400);
  });

  it('returns 404 when target user does not exist', async () => {
    const alice = await registerAndLogin('flalice7');

    const res = await request(app)
      .delete('/follows/nonexistentuser999')
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(404);
  });
});
