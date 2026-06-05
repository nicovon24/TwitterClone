import { eq, and, inArray, isNull, lt, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tweets, users, follows, likes } from '../db/schema.js';
import { broadcastToFollowers } from '../sse/sseManager.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TweetUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface TweetWithUser {
  id: string;
  content: string;
  created_at: Date;
  user: TweetUser;
  likes_count: number;
  liked_by_me: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function encodeCursor(created_at: Date, id: string): string {
  return Buffer.from(JSON.stringify({ created_at: created_at.toISOString(), id })).toString(
    'base64',
  );
}

function decodeCursor(cursor: string): { created_at: string; id: string } {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as { created_at: string; id: string };
    if (typeof parsed.created_at !== 'string' || typeof parsed.id !== 'string') {
      throw new Error('Invalid cursor shape');
    }
    return parsed;
  } catch {
    throw { status: 400, message: 'Invalid cursor' };
  }
}

// ---------------------------------------------------------------------------
// createTweet
// ---------------------------------------------------------------------------

export async function createTweet(userId: string, content: string): Promise<TweetWithUser> {
  // Insert new tweet
  const [inserted] = await db
    .insert(tweets)
    .values({ user_id: userId, content })
    .returning();

  // Fetch the author to build the response shape
  const [author] = await db
    .select({ id: users.id, username: users.username, avatar_url: users.avatar_url })
    .from(users)
    .where(eq(users.id, userId));

  const tweetPayload: TweetWithUser = {
    id: inserted.id,
    content: inserted.content,
    created_at: inserted.created_at,
    user: {
      id: author.id,
      username: author.username,
      avatar_url: author.avatar_url,
    },
    likes_count: 0,
    liked_by_me: false,
  };

  // Broadcast to followers via SSE (fire and forget)
  const followerRows = await db
    .select({ follower_id: follows.follower_id })
    .from(follows)
    .where(eq(follows.following_id, userId));

  const followerIds = followerRows.map((r) => r.follower_id);
  if (followerIds.length > 0) {
    broadcastToFollowers(followerIds, tweetPayload);
  }

  return tweetPayload;
}

// ---------------------------------------------------------------------------
// softDeleteTweet
// ---------------------------------------------------------------------------

export async function softDeleteTweet(tweetId: string, requesterId: string): Promise<void> {
  const [tweet] = await db.select().from(tweets).where(eq(tweets.id, tweetId));

  if (!tweet) {
    throw { status: 404, message: 'Tweet not found' };
  }

  if (tweet.user_id !== requesterId) {
    throw { status: 403, message: 'Forbidden' };
  }

  // Soft delete: set deleted_at to now — never DELETE the row (ADR-006)
  await db
    .update(tweets)
    .set({ deleted_at: new Date() })
    .where(eq(tweets.id, tweetId));
}

// ---------------------------------------------------------------------------
// getTimeline
// ---------------------------------------------------------------------------

export async function getTimeline(
  userId: string,
  cursor?: string,
  limit = 20,
): Promise<{ tweets: TweetWithUser[]; nextCursor: string | null }> {
  const safeLimit = Math.min(limit, 50);

  // Resolve the set of users that userId follows
  const followingRows = await db
    .select({ following_id: follows.following_id })
    .from(follows)
    .where(eq(follows.follower_id, userId));

  if (followingRows.length === 0) {
    return { tweets: [], nextCursor: null };
  }

  const followingIds = followingRows.map((r) => r.following_id);

  // Decode cursor if provided
  let cursorDate: Date | null = null;
  let cursorId: string | null = null;

  if (cursor) {
    const decoded = decodeCursor(cursor);
    cursorDate = new Date(decoded.created_at);
    cursorId = decoded.id;
  }

  // Build the main query with optional cursor condition
  const results = await db
    .select({
      id: tweets.id,
      content: tweets.content,
      created_at: tweets.created_at,
      user_id: tweets.user_id,
      username: users.username,
      avatar_url: users.avatar_url,
      likes_count: sql<number>`CAST(COUNT(${likes.tweet_id}) AS INTEGER)`,
      liked_by_me: sql<number>`MAX(CASE WHEN ${likes.user_id} = ${userId} THEN 1 ELSE 0 END)`,
    })
    .from(tweets)
    .innerJoin(users, eq(tweets.user_id, users.id))
    .leftJoin(likes, eq(likes.tweet_id, tweets.id))
    .where(
      and(
        inArray(tweets.user_id, followingIds),
        isNull(tweets.deleted_at),
        // Composite cursor: (created_at, id) < (cursorDate, cursorId)
        cursorDate !== null && cursorId !== null
          ? sql`(${tweets.created_at}, ${tweets.id}) < (${cursorDate.toISOString()}::timestamptz, ${cursorId}::uuid)`
          : undefined,
      ),
    )
    .groupBy(tweets.id, users.username, users.avatar_url)
    .orderBy(desc(tweets.created_at), desc(tweets.id))
    .limit(safeLimit + 1);

  const hasMore = results.length > safeLimit;
  const page = hasMore ? results.slice(0, safeLimit) : results;

  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1].created_at, page[page.length - 1].id)
      : null;

  const tweetList: TweetWithUser[] = page.map((row) => ({
    id: row.id,
    content: row.content,
    created_at: row.created_at,
    user: {
      id: row.user_id,
      username: row.username,
      avatar_url: row.avatar_url,
    },
    likes_count: row.likes_count,
    liked_by_me: row.liked_by_me === 1,
  }));

  return { tweets: tweetList, nextCursor };
}
