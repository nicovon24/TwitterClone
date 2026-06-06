import { eq, and, gt, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { follows, users } from '../db/schema.js';

export interface UserSummary {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_following: boolean;
}

// Resolve a username to a user id; returns undefined if not found
async function resolveUsername(username: string): Promise<string | undefined> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return user?.id;
}

export async function follow(followerId: string, targetUsername: string): Promise<void> {
  const targetId = await resolveUsername(targetUsername);
  if (!targetId) {
    throw { status: 404, message: 'User not found' };
  }
  if (followerId === targetId) {
    throw { status: 400, message: 'Cannot follow yourself' };
  }
  try {
    await db.insert(follows).values({ follower_id: followerId, following_id: targetId });
  } catch (err: unknown) {
    // Unique constraint violation — already following
    const pgErr = err as { code?: string };
    if (pgErr?.code === '23505') {
      throw { status: 409, message: 'Already following this user' };
    }
    throw err;
  }
}

export async function unfollow(followerId: string, targetUsername: string): Promise<void> {
  const targetId = await resolveUsername(targetUsername);
  if (!targetId) {
    throw { status: 404, message: 'User not found' };
  }
  const result = await db
    .delete(follows)
    .where(and(eq(follows.follower_id, followerId), eq(follows.following_id, targetId)));
  // postgres-js returns rowCount on the result
  const rowCount = (result as unknown as { count?: number }).count ?? 0;
  if (rowCount === 0) {
    throw { status: 400, message: 'Not following this user' };
  }
}

export async function getFollowers(
  username: string,
  requesterId?: string,
  cursor?: string,
  limit = 20,
): Promise<{ users: UserSummary[]; nextCursor: string | null }> {
  const userId = await resolveUsername(username);
  if (!userId) {
    throw { status: 404, message: 'User not found' };
  }

  const effectiveLimit = Math.min(limit, 50);

  // Select followers: users that have a follow row with following_id = userId
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      display_name: users.display_name,
      bio: users.bio,
      avatar_url: users.avatar_url,
    })
    .from(follows)
    .innerJoin(users, eq(users.id, follows.follower_id))
    .where(
      cursor
        ? and(eq(follows.following_id, userId), gt(users.id, cursor))
        : eq(follows.following_id, userId),
    )
    .orderBy(users.id)
    .limit(effectiveLimit + 1);

  const hasMore = rows.length > effectiveLimit;
  const pageRows = hasMore ? rows.slice(0, effectiveLimit) : rows;

  let followingSet = new Set<string>();
  if (requesterId && pageRows.length > 0) {
    const ids = pageRows.map((r) => r.id);
    const followingRows = await db
      .select({ following_id: follows.following_id })
      .from(follows)
      .where(
        and(
          eq(follows.follower_id, requesterId),
          sql`${follows.following_id} = ANY(${sql.raw(`ARRAY[${ids.map(() => '?').join(',')}]`)})`
        )
      );
    followingSet = new Set(followingRows.map((r) => r.following_id));
  }

  // Simpler approach for is_following check
  const userList: UserSummary[] = await Promise.all(
    pageRows.map(async (row) => {
      let isFollowing = false;
      if (requesterId) {
        const [f] = await db
          .select({ follower_id: follows.follower_id })
          .from(follows)
          .where(and(eq(follows.follower_id, requesterId), eq(follows.following_id, row.id)))
          .limit(1);
        isFollowing = !!f;
      }
      return { ...row, is_following: isFollowing };
    }),
  );

  return {
    users: userList,
    nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null,
  };
}

export async function getFollowing(
  username: string,
  requesterId?: string,
  cursor?: string,
  limit = 20,
): Promise<{ users: UserSummary[]; nextCursor: string | null }> {
  const userId = await resolveUsername(username);
  if (!userId) {
    throw { status: 404, message: 'User not found' };
  }

  const effectiveLimit = Math.min(limit, 50);

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      display_name: users.display_name,
      bio: users.bio,
      avatar_url: users.avatar_url,
    })
    .from(follows)
    .innerJoin(users, eq(users.id, follows.following_id))
    .where(
      cursor
        ? and(eq(follows.follower_id, userId), gt(users.id, cursor))
        : eq(follows.follower_id, userId),
    )
    .orderBy(users.id)
    .limit(effectiveLimit + 1);

  const hasMore = rows.length > effectiveLimit;
  const pageRows = hasMore ? rows.slice(0, effectiveLimit) : rows;

  const userList: UserSummary[] = await Promise.all(
    pageRows.map(async (row) => {
      let isFollowing = false;
      if (requesterId) {
        const [f] = await db
          .select({ follower_id: follows.follower_id })
          .from(follows)
          .where(and(eq(follows.follower_id, requesterId), eq(follows.following_id, row.id)))
          .limit(1);
        isFollowing = !!f;
      }
      return { ...row, is_following: isFollowing };
    }),
  );

  return {
    users: userList,
    nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null,
  };
}

export async function getFollowerIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ follower_id: follows.follower_id })
    .from(follows)
    .where(eq(follows.following_id, userId));
  return rows.map((r) => r.follower_id);
}
