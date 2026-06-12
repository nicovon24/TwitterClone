import { eq, and, count, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { likes, tweets } from '../db/schema.js';
import * as notificationService from './notificationService.js';

async function getTweetOrThrow(tweetId: string): Promise<void> {
  const [tweet] = await db
    .select({ id: tweets.id })
    .from(tweets)
    .where(and(eq(tweets.id, tweetId), isNull(tweets.deleted_at)))
    .limit(1);
  if (!tweet) {
    throw { status: 404, message: 'Tweet not found' };
  }
}

async function getLikesCount(tweetId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(likes)
    .where(eq(likes.tweet_id, tweetId));
  return Number(row?.value ?? 0);
}

export async function likeTweet(userId: string, tweetId: string): Promise<{ likes_count: number }> {
  await getTweetOrThrow(tweetId);
  try {
    await db.insert(likes).values({ user_id: userId, tweet_id: tweetId });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr?.code === '23505') {
      throw { status: 409, message: 'Already liked' };
    }
    throw err;
  }
  // Fire-and-forget notification to tweet owner
  db.select({ user_id: tweets.user_id })
    .from(tweets)
    .where(eq(tweets.id, tweetId))
    .limit(1)
    .then(([tweetRow]) => {
      if (tweetRow) {
        notificationService.createNotification({
          recipientId: tweetRow.user_id,
          actorId: userId,
          type: 'like',
          tweetId,
        }).catch(() => {});
      }
    })
    .catch(() => {});
  const likes_count = await getLikesCount(tweetId);
  return { likes_count };
}

export async function unlikeTweet(userId: string, tweetId: string): Promise<{ likes_count: number }> {
  // Verify tweet exists (deleted or not — we still allow unliking even if soft-deleted)
  const [tweet] = await db
    .select({ id: tweets.id })
    .from(tweets)
    .where(eq(tweets.id, tweetId))
    .limit(1);
  if (!tweet) {
    throw { status: 404, message: 'Tweet not found' };
  }

  const result = await db
    .delete(likes)
    .where(and(eq(likes.user_id, userId), eq(likes.tweet_id, tweetId)));
  const rowCount = (result as unknown as { count?: number }).count ?? 0;
  if (rowCount === 0) {
    throw { status: 400, message: 'Not liked' };
  }

  const likes_count = await getLikesCount(tweetId);
  return { likes_count };
}
