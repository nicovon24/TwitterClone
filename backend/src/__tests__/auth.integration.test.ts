import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_USER = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
};

async function registerUser(overrides: Partial<typeof VALID_USER> = {}) {
  return request(app)
    .post('/auth/register')
    .send({ ...VALID_USER, ...overrides });
}

async function loginUser(email = VALID_USER.email, password = VALID_USER.password) {
  return request(app).post('/auth/login').send({ email, password });
}

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------

describe('POST /auth/register', () => {
  it('registers a new user and returns 201 with tokens + user', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toMatchObject({
      username: VALID_USER.username,
      email: VALID_USER.email,
    });
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('returns 409 when email is already taken', async () => {
    await registerUser();
    const res = await registerUser({ username: 'otherusername' });
    expect(res.status).toBe(409);
  });

  it('returns 409 when username is already taken', async () => {
    await registerUser();
    const res = await registerUser({ email: 'other@example.com' });
    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid email', async () => {
    const res = await registerUser({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for password shorter than 8 chars', async () => {
    const res = await registerUser({ password: 'short' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

describe('POST /auth/login', () => {
  it('logs in with valid credentials and returns 200 with tokens + user', async () => {
    await registerUser();
    const res = await loginUser();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toMatchObject({ email: VALID_USER.email });
  });

  it('returns 401 for wrong password', async () => {
    await registerUser();
    const res = await loginUser(VALID_USER.email, 'wrongpassword');
    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent email', async () => {
    const res = await loginUser('nobody@example.com', 'password123');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------

describe('GET /auth/me', () => {
  it('returns 200 + user object when authenticated', async () => {
    const reg = await registerUser();
    const { accessToken } = reg.body as { accessToken: string };

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      username: VALID_USER.username,
      email: VALID_USER.email,
    });
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is expired / invalid', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer this.is.invalid');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------

describe('POST /auth/refresh', () => {
  it('returns 200 + new accessToken for a valid refreshToken', async () => {
    const reg = await registerUser();
    const { refreshToken } = reg.body as { refreshToken: string };

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('returns 401 for an invalid refreshToken', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'invalid.token.value' });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------

describe('POST /auth/logout', () => {
  it('logs out with valid token → 200; subsequent refresh fails with 401', async () => {
    const reg = await registerUser();
    const { accessToken, refreshToken } = reg.body as {
      accessToken: string;
      refreshToken: string;
    };

    const logoutRes = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body).toMatchObject({ message: 'Logged out' });

    // After logout the stored refresh token hash is cleared — refresh must fail
    const refreshRes = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(401);
  });
});
