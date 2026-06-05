import { eq, and, gt, count, sql, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, follows, tweets } from '../db/schema.js';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  followers_count: number;
  following_count: number;
  tweets_count: number;
  is_following: boolean;
}

export interface UserSummary {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_following: boolean;
}

export async function getProfile(username: string, requesterId?: string): Promise<UserProfile> {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      display_name: users.display_name,
      bio: users.bio,
      avatar_url: users.avatar_url,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  const [followersRow] = await db
    .select({ value: count() })
    .from(follows)
    .where(eq(follows.following_id, user.id));

  const [followingRow] = await db
    .select({ value: count() })
    .from(follows)
    .where(eq(follows.follower_id, user.id));

  const [tweetsRow] = await db
    .select({ value: count() })
    .from(tweets)
    .where(and(eq(tweets.user_id, user.id), isNull(tweets.deleted_at)));

  let is_following = false;
  if (requesterId) {
    const [f] = await db
      .select({ follower_id: follows.follower_id })
      .from(follows)
      .where(and(eq(follows.follower_id, requesterId), eq(follows.following_id, user.id)))
      .limit(1);
    is_following = !!f;
  }

  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name ?? null,
    bio: user.bio ?? null,
    avatar_url: user.avatar_url ?? null,
    followers_count: Number(followersRow?.value ?? 0),
    following_count: Number(followingRow?.value ?? 0),
    tweets_count: Number(tweetsRow?.value ?? 0),
    is_following,
  };
}

export async function searchUsers(
  query: string,
  requesterId: string,
  cursor?: string,
  limit = 20,
): Promise<{ users: UserSummary[]; nextCursor: string | null }> {
  const effectiveLimit = Math.min(limit, 50);
  const pattern = `${query}%`;

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      display_name: users.display_name,
      bio: users.bio,
      avatar_url: users.avatar_url,
    })
    .from(users)
    .where(
      cursor
        ? and(
            sql`(${users.username} ILIKE ${pattern} OR ${users.display_name} ILIKE ${pattern})`,
            gt(users.username, cursor),
          )
        : sql`(${users.username} ILIKE ${pattern} OR ${users.display_name} ILIKE ${pattern})`,
    )
    .orderBy(users.username)
    .limit(effectiveLimit + 1);

  const hasMore = rows.length > effectiveLimit;
  const pageRows = hasMore ? rows.slice(0, effectiveLimit) : rows;

  const userList: UserSummary[] = await Promise.all(
    pageRows.map(async (row) => {
      const [f] = await db
        .select({ follower_id: follows.follower_id })
        .from(follows)
        .where(and(eq(follows.follower_id, requesterId), eq(follows.following_id, row.id)))
        .limit(1);
      return {
        ...row,
        display_name: row.display_name ?? null,
        bio: row.bio ?? null,
        avatar_url: row.avatar_url ?? null,
        is_following: !!f,
      };
    }),
  );

  return {
    users: userList,
    nextCursor: hasMore ? pageRows[pageRows.length - 1].username : null,
  };
}
