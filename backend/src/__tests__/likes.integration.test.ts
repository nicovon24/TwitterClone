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

async function createTweet(accessToken: string, content: string): Promise<{ id: string }> {
  const res = await request(app)
    .post('/tweets')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ content });
  return res.body as { id: string };
}

// ---------------------------------------------------------------------------
// POST /likes/:tweetId
// ---------------------------------------------------------------------------

describe('POST /likes/:tweetId', () => {
  it('likes a tweet → 201 with likes_count: 1', async () => {
    const alice = await registerAndLogin('lkalice1');
    const tweet = await createTweet(alice.accessToken, 'likeable tweet');

    const res = await request(app)
      .post(`/likes/${tweet.id}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ message: 'Tweet liked', likes_count: 1 });
  });

  it('returns 409 when already liked', async () => {
    const alice = await registerAndLogin('lkalice2');
    const tweet = await createTweet(alice.accessToken, 'likeable tweet 2');

    await request(app)
      .post(`/likes/${tweet.id}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    const res = await request(app)
      .post(`/likes/${tweet.id}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(409);
  });

  it('returns 404 for a non-existent tweet', async () => {
    const alice = await registerAndLogin('lkalice3');

    const res = await request(app)
      .post('/likes/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /likes/:tweetId
// ---------------------------------------------------------------------------

describe('DELETE /likes/:tweetId', () => {
  it('unlikes a tweet → 200 with likes_count: 0', async () => {
    const alice = await registerAndLogin('lkalice4');
    const tweet = await createTweet(alice.accessToken, 'unlikeable tweet');

    await request(app)
      .post(`/likes/${tweet.id}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    const res = await request(app)
      .delete(`/likes/${tweet.id}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Tweet unliked', likes_count: 0 });
  });

  it('returns 400 when tweet was not liked', async () => {
    const alice = await registerAndLogin('lkalice5');
    const tweet = await createTweet(alice.accessToken, 'never liked tweet');

    const res = await request(app)
      .delete(`/likes/${tweet.id}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(400);
  });

  it('returns 404 for a non-existent tweet', async () => {
    const alice = await registerAndLogin('lkalice6');

    const res = await request(app)
      .delete('/likes/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(404);
  });
});
