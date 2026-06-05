import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface AuthResult {
  accessToken: string;
  refreshToken: string;
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

async function followUser(followerToken: string, username: string): Promise<void> {
  await request(app)
    .post(`/follows/${username}`)
    .set('Authorization', `Bearer ${followerToken}`);
}

// ---------------------------------------------------------------------------
// GET /timeline
// ---------------------------------------------------------------------------

describe('GET /timeline', () => {
  it('falls back to recent tweets from everyone when user follows nobody ("For you")', async () => {
    const solo = await registerAndLogin('tlsolo');
    const other = await registerAndLogin('tlother');

    // `solo` follows nobody, yet a tweet from an unrelated user should surface.
    const tweet = await createTweet(other.accessToken, 'for-you fallback tweet');

    const res = await request(app)
      .get('/timeline')
      .set('Authorization', `Bearer ${solo.accessToken}`);

    expect(res.status).toBe(200);
    const ids = (res.body.tweets as { id: string }[]).map((t) => t.id);
    expect(ids).toContain(tweet.id);
  });

  it('returns only tweets from followed users, not own tweets', async () => {
    const alice = await registerAndLogin('tlalice2');
    const bob = await registerAndLogin('tlbob2');

    // Alice follows bob
    await followUser(alice.accessToken, bob.user.username);

    // Bob posts a tweet; alice posts her own tweet
    await createTweet(bob.accessToken, 'hello from bob');
    await createTweet(alice.accessToken, 'alice own tweet');

    const res = await request(app)
      .get('/timeline')
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tweets).toHaveLength(1);
    expect(res.body.tweets[0]).toMatchObject({ content: 'hello from bob' });
  });

  it('excludes soft-deleted tweets from timeline', async () => {
    const alice = await registerAndLogin('tlalice3');
    const bob = await registerAndLogin('tlbob3');

    await followUser(alice.accessToken, bob.user.username);

    const tweet = await createTweet(bob.accessToken, 'to be deleted');
    await request(app)
      .delete(`/tweets/${tweet.id}`)
      .set('Authorization', `Bearer ${bob.accessToken}`);

    const res = await request(app)
      .get('/timeline')
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tweets).toHaveLength(0);
  });

  it('paginates: 25 tweets → first page 20 + nextCursor; second page 5 + null cursor', async () => {
    const alice = await registerAndLogin('tlalice4');
    const bob = await registerAndLogin('tlbob4');

    await followUser(alice.accessToken, bob.user.username);

    // Create 25 tweets by bob
    for (let i = 0; i < 25; i++) {
      await createTweet(bob.accessToken, `tweet ${i}`);
    }

    const page1 = await request(app)
      .get('/timeline')
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(page1.status).toBe(200);
    expect(page1.body.tweets).toHaveLength(20);
    expect(page1.body.next_cursor).not.toBeNull();

    const cursor: string = page1.body.next_cursor as string;

    const page2 = await request(app)
      .get(`/timeline?cursor=${cursor}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(page2.status).toBe(200);
    expect(page2.body.tweets).toHaveLength(5);
    expect(page2.body.next_cursor).toBeNull();
  });

  it('cursor pagination has no duplicates between pages', async () => {
    const alice = await registerAndLogin('tlalice5');
    const bob = await registerAndLogin('tlbob5');

    await followUser(alice.accessToken, bob.user.username);

    for (let i = 0; i < 25; i++) {
      await createTweet(bob.accessToken, `dup-tweet ${i}`);
    }

    const page1 = await request(app)
      .get('/timeline')
      .set('Authorization', `Bearer ${alice.accessToken}`);

    const cursor: string = page1.body.next_cursor as string;

    const page2 = await request(app)
      .get(`/timeline?cursor=${cursor}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);

    const ids1 = new Set((page1.body.tweets as { id: string }[]).map((t) => t.id));
    const ids2 = (page2.body.tweets as { id: string }[]).map((t) => t.id);

    for (const id of ids2) {
      expect(ids1.has(id)).toBe(false);
    }
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/timeline');
    expect(res.status).toBe(401);
  });
});
