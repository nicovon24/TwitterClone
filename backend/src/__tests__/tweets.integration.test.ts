import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { testDb } from './setup.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function registerAndLogin(suffix = 'a') {
  const user = {
    username: `tweetuser${suffix}`,
    email: `tweetuser${suffix}@example.com`,
    password: 'password123',
  };
  const res = await request(app).post('/auth/register').send(user);
  return res.body as { accessToken: string; refreshToken: string; user: { id: string } };
}

// ---------------------------------------------------------------------------
// POST /tweets
// ---------------------------------------------------------------------------

describe('POST /tweets', () => {
  it('creates a tweet and returns 201 with tweet object including likes_count: 0', async () => {
    const auth = await registerAndLogin();
    const res = await request(app)
      .post('/tweets')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .send({ content: 'Hello, world!' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      content: 'Hello, world!',
      likes_count: 0,
    });
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('created_at');
    expect(res.body.user).toHaveProperty('username');
  });

  it('returns 400 for content longer than 280 chars', async () => {
    const auth = await registerAndLogin('b');
    const res = await request(app)
      .post('/tweets')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .send({ content: 'x'.repeat(281) });

    expect(res.status).toBe(400);
  });

  it('returns 400 for empty content', async () => {
    const auth = await registerAndLogin('c');
    const res = await request(app)
      .post('/tweets')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post('/tweets')
      .send({ content: 'Hello' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// DELETE /tweets/:id
// ---------------------------------------------------------------------------

describe('DELETE /tweets/:id', () => {
  it('soft-deletes a tweet as owner → 200 and deleted_at is set in DB', async () => {
    const auth = await registerAndLogin('d');
    const createRes = await request(app)
      .post('/tweets')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .send({ content: 'to be deleted' });

    const tweetId: string = createRes.body.id;

    const deleteRes = await request(app)
      .delete(`/tweets/${tweetId}`)
      .set('Authorization', `Bearer ${auth.accessToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toMatchObject({ message: 'Tweet deleted' });

    // Verify deleted_at is set in the real DB
    const rows = await testDb<{ deleted_at: Date | null }[]>`
      SELECT deleted_at FROM tweets WHERE id = ${tweetId}
    `;
    expect(rows[0]?.deleted_at).not.toBeNull();
  });

  it('returns 403 when a different user tries to delete the tweet', async () => {
    const owner = await registerAndLogin('e');
    const other = await registerAndLogin('f');

    const createRes = await request(app)
      .post('/tweets')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ content: 'owner tweet' });

    const tweetId: string = createRes.body.id;

    const res = await request(app)
      .delete(`/tweets/${tweetId}`)
      .set('Authorization', `Bearer ${other.accessToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent tweet id', async () => {
    const auth = await registerAndLogin('g');
    const res = await request(app)
      .delete('/tweets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${auth.accessToken}`);

    expect(res.status).toBe(404);
  });
});
