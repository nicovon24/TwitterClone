import { eq, and, inArray, isNull, isNotNull, lt, sql, desc, asc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db/index.js';
import { tweets, users, follows, likes, notifications } from '../db/schema.js';
import { broadcastToFollowers } from '../sse/sseManager.js';
import * as notificationService from './notificationService.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TweetUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface TweetWithUser {
  id: string;
  content: string;
  image_url: string | null;
  created_at: Date;
  parent_tweet_id: string | null;
  replies_count: number;
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

export async function createTweet(
  userId: string,
  content: string,
  image_url?: string | null,
  parent_tweet_id?: string | null,
): Promise<TweetWithUser> {
  // Validate parent tweet if provided
  let parent: { id: string; user_id: string } | undefined;
  if (parent_tweet_id) {
    const [found] = await db
      .select({ id: tweets.id, user_id: tweets.user_id })
      .from(tweets)
      .where(and(eq(tweets.id, parent_tweet_id), isNull(tweets.deleted_at)))
      .limit(1);
    if (!found) throw { status: 404, message: 'Parent tweet not found' };
    parent = found;
  }

  // Insert new tweet
  const [inserted] = await db
    .insert(tweets)
    .values({ user_id: userId, content, image_url: image_url ?? null, parent_tweet_id: parent_tweet_id ?? null })
    .returning();

  // Fetch the author to build the response shape
  const [author] = await db
    .select({ id: users.id, username: users.username, display_name: users.display_name, avatar_url: users.avatar_url })
    .from(users)
    .where(eq(users.id, userId));

  const tweetPayload: TweetWithUser = {
    id: inserted.id,
    content: inserted.content,
    image_url: inserted.image_url ?? null,
    created_at: inserted.created_at,
    parent_tweet_id: inserted.parent_tweet_id ?? null,
    replies_count: 0,
    user: {
      id: author.id,
      username: author.username,
      display_name: author.display_name ?? null,
      avatar_url: author.avatar_url ?? null,
    },
    likes_count: 0,
    liked_by_me: false,
  };

  // Reply notification
  if (parent_tweet_id && parent) {
    notificationService.createNotification({
      recipientId: parent.user_id,
      actorId: userId,
      type: 'reply',
      tweetId: inserted.id,
    }).catch(() => {});
  }

  // Mention notifications (parse @username from content, max 10)
  const mentionMatches = [...content.matchAll(/(?<![a-zA-Z0-9_])@([a-zA-Z0-9_]{1,50})/g)];
  const mentionedUsernames = [...new Set(mentionMatches.map((m) => m[1]))].slice(0, 10);
  if (mentionedUsernames.length > 0) {
    const mentionedUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.username, mentionedUsernames));

    await Promise.allSettled(
      mentionedUsers.map((u) =>
        notificationService.createNotification({
          recipientId: u.id,
          actorId: userId,
          type: 'mention',
          tweetId: inserted.id,
        }),
      ),
    );
  }

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

export type TimelineFeed = 'for-you' | 'following';

export async function getTimeline(
  userId: string,
  feed: TimelineFeed = 'for-you',
  cursor?: string,
  limit = 10,
): Promise<{ tweets: TweetWithUser[]; nextCursor: string | null }> {
  const safeLimit = Math.min(limit, 50);
  const repliesAlias = alias(tweets, 'replies');

  // "following" feed is scoped to the accounts the user follows. "for-you" is
  // a global feed of every tweet, so it skips the follow lookup entirely.
  let followingIds: string[] = [];
  if (feed === 'following') {
    const followingRows = await db
      .select({ following_id: follows.following_id })
      .from(follows)
      .where(eq(follows.follower_id, userId));

    followingIds = followingRows.map((r) => r.following_id);

    // Following nobody → empty feed. The "Para ti" tab is the discovery path.
    if (followingIds.length === 0) {
      return { tweets: [], nextCursor: null };
    }
  }

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
      image_url: tweets.image_url,
      created_at: tweets.created_at,
      parent_tweet_id: tweets.parent_tweet_id,
      user_id: tweets.user_id,
      username: users.username,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
      likes_count: sql<number>`CAST(COUNT(DISTINCT ${likes.tweet_id}) AS INTEGER)`,
      liked_by_me: sql<number>`MAX(CASE WHEN ${likes.user_id} = ${userId} THEN 1 ELSE 0 END)`,
      replies_count: sql<number>`CAST(COUNT(DISTINCT ${repliesAlias.id}) AS INTEGER)`,
    })
    .from(tweets)
    .innerJoin(users, eq(tweets.user_id, users.id))
    .leftJoin(likes, eq(likes.tweet_id, tweets.id))
    .leftJoin(repliesAlias, and(eq(repliesAlias.parent_tweet_id, tweets.id), isNull(repliesAlias.deleted_at)))
    .where(
      and(
        feed === 'following' ? inArray(tweets.user_id, followingIds) : undefined,
        isNull(tweets.deleted_at),
        isNull(tweets.parent_tweet_id),
        cursorDate !== null && cursorId !== null
          ? sql`(${tweets.created_at}, ${tweets.id}) < (${cursorDate.toISOString()}::timestamptz, ${cursorId}::uuid)`
          : undefined,
      ),
    )
    .groupBy(tweets.id, users.username, users.display_name, users.avatar_url)
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
    image_url: row.image_url ?? null,
    created_at: row.created_at,
    parent_tweet_id: row.parent_tweet_id ?? null,
    user: {
      id: row.user_id,
      username: row.username,
      display_name: row.display_name ?? null,
      avatar_url: row.avatar_url ?? null,
    },
    likes_count: row.likes_count,
    liked_by_me: row.liked_by_me === 1,
    replies_count: row.replies_count,
  }));

  return { tweets: tweetList, nextCursor };
}

// ---------------------------------------------------------------------------
// getTweetById
// ---------------------------------------------------------------------------

export async function getTweetById(
  tweetId: string,
  requesterId: string,
): Promise<TweetWithUser> {
  const repliesAlias = alias(tweets, 'replies');

  const results = await db
    .select({
      id: tweets.id,
      content: tweets.content,
      image_url: tweets.image_url,
      created_at: tweets.created_at,
      parent_tweet_id: tweets.parent_tweet_id,
      user_id: tweets.user_id,
      username: users.username,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
      likes_count: sql<number>`CAST(COUNT(DISTINCT ${likes.tweet_id}) AS INTEGER)`,
      liked_by_me: sql<number>`MAX(CASE WHEN ${likes.user_id} = ${requesterId} THEN 1 ELSE 0 END)`,
      replies_count: sql<number>`CAST(COUNT(DISTINCT ${repliesAlias.id}) AS INTEGER)`,
    })
    .from(tweets)
    .innerJoin(users, eq(tweets.user_id, users.id))
    .leftJoin(likes, eq(likes.tweet_id, tweets.id))
    .leftJoin(repliesAlias, and(eq(repliesAlias.parent_tweet_id, tweets.id), isNull(repliesAlias.deleted_at)))
    .where(and(eq(tweets.id, tweetId), isNull(tweets.deleted_at)))
    .groupBy(tweets.id, users.username, users.display_name, users.avatar_url)
    .limit(1)

  if (results.length === 0) {
    throw { status: 404, message: 'Tweet not found' }
  }

  const row = results[0]
  return {
    id: row.id,
    content: row.content,
    image_url: row.image_url ?? null,
    created_at: row.created_at,
    parent_tweet_id: row.parent_tweet_id ?? null,
    user: { id: row.user_id, username: row.username, display_name: row.display_name ?? null, avatar_url: row.avatar_url ?? null },
    likes_count: row.likes_count,
    liked_by_me: row.liked_by_me === 1,
    replies_count: row.replies_count,
  }
}

// ---------------------------------------------------------------------------
// getUserTweets
// ---------------------------------------------------------------------------

export async function getUserTweets(
  username: string,
  requesterId: string | undefined,
  cursor?: string,
  limit = 20,
  onlyReplies = false,
): Promise<{ tweets: TweetWithUser[]; nextCursor: string | null }> {
  const safeLimit = Math.min(limit, 50)
  const repliesAlias = alias(tweets, 'replies');

  // Resolve user id from username
  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  if (!userRow) {
    throw { status: 404, message: 'User not found' }
  }

  const userId = userRow.id

  let cursorDate: Date | null = null
  let cursorId: string | null = null

  if (cursor) {
    const decoded = decodeCursor(cursor)
    cursorDate = new Date(decoded.created_at)
    cursorId = decoded.id
  }

  const likedByMeExpr = requesterId
    ? sql<number>`MAX(CASE WHEN ${likes.user_id} = ${requesterId} THEN 1 ELSE 0 END)`
    : sql<number>`0`

  const results = await db
    .select({
      id: tweets.id,
      content: tweets.content,
      image_url: tweets.image_url,
      created_at: tweets.created_at,
      parent_tweet_id: tweets.parent_tweet_id,
      user_id: tweets.user_id,
      username: users.username,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
      likes_count: sql<number>`CAST(COUNT(DISTINCT ${likes.tweet_id}) AS INTEGER)`,
      liked_by_me: likedByMeExpr,
      replies_count: sql<number>`CAST(COUNT(DISTINCT ${repliesAlias.id}) AS INTEGER)`,
    })
    .from(tweets)
    .innerJoin(users, eq(tweets.user_id, users.id))
    .leftJoin(likes, eq(likes.tweet_id, tweets.id))
    .leftJoin(repliesAlias, and(eq(repliesAlias.parent_tweet_id, tweets.id), isNull(repliesAlias.deleted_at)))
    .where(
      and(
        eq(tweets.user_id, userId),
        isNull(tweets.deleted_at),
        onlyReplies ? isNotNull(tweets.parent_tweet_id) : isNull(tweets.parent_tweet_id),
        cursorDate !== null && cursorId !== null
          ? sql`(${tweets.created_at}, ${tweets.id}) < (${cursorDate.toISOString()}::timestamptz, ${cursorId}::uuid)`
          : undefined,
      ),
    )
    .groupBy(tweets.id, users.username, users.display_name, users.avatar_url)
    .orderBy(desc(tweets.created_at), desc(tweets.id))
    .limit(safeLimit + 1)

  const hasMore = results.length > safeLimit
  const page = hasMore ? results.slice(0, safeLimit) : results
  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1].created_at, page[page.length - 1].id)
      : null

  return {
    tweets: page.map((row) => ({
      id: row.id,
      content: row.content,
      image_url: row.image_url ?? null,
      created_at: row.created_at,
      parent_tweet_id: row.parent_tweet_id ?? null,
      user: { id: row.user_id, username: row.username, display_name: row.display_name ?? null, avatar_url: row.avatar_url ?? null },
      likes_count: row.likes_count,
      liked_by_me: row.liked_by_me === 1,
      replies_count: row.replies_count,
    })),
    nextCursor,
  }
}

// ---------------------------------------------------------------------------
// getReplies
// ---------------------------------------------------------------------------

export async function getReplies(
  tweetId: string,
  requesterId: string,
  cursor?: string,
  limit = 20,
): Promise<{ tweets: TweetWithUser[]; nextCursor: string | null }> {
  const safeLimit = Math.min(limit, 50);
  const repliesAlias = alias(tweets, 'replies_count_join');

  let cursorDate: Date | null = null;
  let cursorId: string | null = null;
  if (cursor) {
    const decoded = decodeCursor(cursor);
    cursorDate = new Date(decoded.created_at);
    cursorId = decoded.id;
  }

  const results = await db
    .select({
      id: tweets.id,
      content: tweets.content,
      image_url: tweets.image_url,
      created_at: tweets.created_at,
      parent_tweet_id: tweets.parent_tweet_id,
      user_id: tweets.user_id,
      username: users.username,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
      likes_count: sql<number>`CAST(COUNT(DISTINCT ${likes.tweet_id}) AS INTEGER)`,
      liked_by_me: sql<number>`MAX(CASE WHEN ${likes.user_id} = ${requesterId} THEN 1 ELSE 0 END)`,
      replies_count: sql<number>`CAST(COUNT(DISTINCT ${repliesAlias.id}) AS INTEGER)`,
    })
    .from(tweets)
    .innerJoin(users, eq(tweets.user_id, users.id))
    .leftJoin(likes, eq(likes.tweet_id, tweets.id))
    .leftJoin(repliesAlias, and(eq(repliesAlias.parent_tweet_id, tweets.id), isNull(repliesAlias.deleted_at)))
    .where(
      and(
        eq(tweets.parent_tweet_id, tweetId),
        isNull(tweets.deleted_at),
        cursorDate !== null && cursorId !== null
          ? sql`(${tweets.created_at}, ${tweets.id}) > (${cursorDate.toISOString()}::timestamptz, ${cursorId}::uuid)`
          : undefined,
      ),
    )
    .groupBy(tweets.id, users.username, users.display_name, users.avatar_url)
    .orderBy(asc(tweets.created_at), asc(tweets.id))
    .limit(safeLimit + 1);

  const hasMore = results.length > safeLimit;
  const page = hasMore ? results.slice(0, safeLimit) : results;
  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1].created_at, page[page.length - 1].id)
      : null;

  return {
    tweets: page.map((row) => ({
      id: row.id,
      content: row.content,
      image_url: row.image_url ?? null,
      created_at: row.created_at,
      parent_tweet_id: row.parent_tweet_id ?? null,
      user: { id: row.user_id, username: row.username, display_name: row.display_name ?? null, avatar_url: row.avatar_url ?? null },
      likes_count: row.likes_count,
      liked_by_me: row.liked_by_me === 1,
      replies_count: row.replies_count,
    })),
    nextCursor,
  };
}
