import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import env from '../env.js';

const BCRYPT_ROUNDS = 10;

// Shape returned for user info (never includes sensitive fields)
export interface PublicUser {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

// Build a status-carrying Error
function httpError(message: string, status: number): Error {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

// Generate access token (15 min) and refresh token JWT (30 d)
function issueTokens(id: string, email: string): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign({ id, email }, env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id, email }, env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

// Store hashed refresh token in DB and set expiry to now + 30 days
async function storeRefreshToken(userId: string, rawRefreshToken: string): Promise<void> {
  const hash = await bcrypt.hash(rawRefreshToken, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db
    .update(users)
    .set({ refresh_token_hash: hash, refresh_token_expires_at: expiresAt })
    .where(eq(users.id, userId));
}

export async function register({
  username,
  email,
  password,
}: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  // Check for duplicate email or username
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    throw httpError('Email already taken', 409);
  }

  const [existingUsername] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existingUsername) {
    throw httpError('Username already taken', 409);
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const [user] = await db
    .insert(users)
    .values({ username, email, password_hash })
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      display_name: users.display_name,
      bio: users.bio,
      avatar_url: users.avatar_url,
    });

  const { accessToken, refreshToken } = issueTokens(user.id, user.email);
  await storeRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken, user };
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Use same error message for missing user and wrong password to prevent user enumeration (T-02-02)
  if (!user) {
    throw httpError('Invalid credentials', 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw httpError('Invalid credentials', 401);
  }

  const { accessToken, refreshToken } = issueTokens(user.id, user.email);
  await storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name ?? null,
      bio: user.bio ?? null,
      avatar_url: user.avatar_url ?? null,
    },
  };
}

export async function logout(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ refresh_token_hash: null, refresh_token_expires_at: null })
    .where(eq(users.id, userId));
}

export async function refresh({
  refreshToken,
}: {
  refreshToken: string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  // Verify the refresh token JWT to extract user id
  let payload: { id: string; email: string };
  try {
    payload = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as { id: string; email: string };
  } catch {
    throw httpError('Invalid or expired refresh token', 401);
  }

  // Load user and check stored hash
  const now = new Date();
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, payload.id),
        gt(users.refresh_token_expires_at, now),
      ),
    )
    .limit(1);

  if (!user || !user.refresh_token_hash) {
    throw httpError('Invalid or expired refresh token', 401);
  }

  const hashMatch = await bcrypt.compare(refreshToken, user.refresh_token_hash);
  if (!hashMatch) {
    throw httpError('Invalid or expired refresh token', 401);
  }

  // Rotate: issue a new refresh token and store its hash
  const { accessToken, refreshToken: newRefreshToken } = issueTokens(user.id, user.email);
  await storeRefreshToken(user.id, newRefreshToken);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function me(userId: string): Promise<PublicUser> {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      display_name: users.display_name,
      bio: users.bio,
      avatar_url: users.avatar_url,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw httpError('User not found', 404);
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    display_name: user.display_name ?? null,
    bio: user.bio ?? null,
    avatar_url: user.avatar_url ?? null,
  };
}
