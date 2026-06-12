import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { notifications, users, tweets } from '../db/schema.js';
import { broadcastToUser } from '../sse/sseManager.js';

export type NotificationType = 'like' | 'follow' | 'reply' | 'mention';

export interface NotificationWithActor {
  id: string;
  type: NotificationType;
  tweet_id: string | null;
  read: boolean;
  created_at: Date;
  actor: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  tweet?: { id: string; content: string };
}

function encodeCursor(created_at: Date, id: string): string {
  return Buffer.from(JSON.stringify({ created_at: created_at.toISOString(), id })).toString('base64');
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

export async function createNotification(params: {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  tweetId?: string;
}): Promise<void> {
  const { recipientId, actorId, type, tweetId } = params;

  // Guard: no self-notifications
  if (actorId === recipientId) return;

  const [inserted] = await db
    .insert(notifications)
    .values({
      recipient_id: recipientId,
      actor_id: actorId,
      type,
      tweet_id: tweetId ?? null,
    })
    .returning();

  // Fetch actor info for SSE payload
  const [actor] = await db
    .select({
      id: users.id,
      username: users.username,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
    })
    .from(users)
    .where(eq(users.id, actorId));

  if (!actor) return;

  let tweetSnippet: { id: string; content: string } | undefined;
  if (tweetId) {
    const [tweetRow] = await db
      .select({ id: tweets.id, content: tweets.content })
      .from(tweets)
      .where(eq(tweets.id, tweetId));
    if (tweetRow) tweetSnippet = { id: tweetRow.id, content: tweetRow.content };
  }

  const payload: NotificationWithActor = {
    id: inserted.id,
    type: inserted.type as NotificationType,
    tweet_id: inserted.tweet_id ?? null,
    read: inserted.read,
    created_at: inserted.created_at,
    actor: {
      id: actor.id,
      username: actor.username,
      display_name: actor.display_name ?? null,
      avatar_url: actor.avatar_url ?? null,
    },
    ...(tweetSnippet ? { tweet: tweetSnippet } : {}),
  };

  broadcastToUser(recipientId, 'notification', payload);
}

export async function getNotifications(
  userId: string,
  cursor?: string,
  limit = 20,
): Promise<{ notifications: NotificationWithActor[]; nextCursor: string | null }> {
  const safeLimit = Math.min(limit, 50);

  let cursorDate: Date | null = null;
  let cursorId: string | null = null;

  if (cursor) {
    const decoded = decodeCursor(cursor);
    cursorDate = new Date(decoded.created_at);
    cursorId = decoded.id;
  }

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      tweet_id: notifications.tweet_id,
      read: notifications.read,
      created_at: notifications.created_at,
      actor_id: notifications.actor_id,
      actor_username: users.username,
      actor_display_name: users.display_name,
      actor_avatar_url: users.avatar_url,
    })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.actor_id))
    .where(
      and(
        eq(notifications.recipient_id, userId),
        cursorDate !== null && cursorId !== null
          ? sql`(${notifications.created_at}, ${notifications.id}) < (${cursorDate.toISOString()}::timestamptz, ${cursorId}::uuid)`
          : undefined,
      ),
    )
    .orderBy(desc(notifications.created_at), desc(notifications.id))
    .limit(safeLimit + 1);

  const hasMore = rows.length > safeLimit;
  const page = hasMore ? rows.slice(0, safeLimit) : rows;

  // Fetch tweet snippets for notifications that have a tweet_id
  const tweetIds = [...new Set(page.filter((r) => r.tweet_id).map((r) => r.tweet_id as string))];
  const tweetMap = new Map<string, { id: string; content: string }>();
  if (tweetIds.length > 0) {
    const tweetRows = await db
      .select({ id: tweets.id, content: tweets.content })
      .from(tweets)
      .where(inArray(tweets.id, tweetIds));
    for (const tw of tweetRows) {
      tweetMap.set(tw.id, tw);
    }
  }

  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1].created_at, page[page.length - 1].id)
      : null;

  return {
    notifications: page.map((row) => ({
      id: row.id,
      type: row.type as NotificationType,
      tweet_id: row.tweet_id ?? null,
      read: row.read,
      created_at: row.created_at,
      actor: {
        id: row.actor_id,
        username: row.actor_username,
        display_name: row.actor_display_name ?? null,
        avatar_url: row.actor_avatar_url ?? null,
      },
      ...(row.tweet_id && tweetMap.has(row.tweet_id) ? { tweet: tweetMap.get(row.tweet_id) } : {}),
    })),
    nextCursor,
  };
}

export async function markRead(notificationId: string, userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.recipient_id, userId)));
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.recipient_id, userId)));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(notifications)
    .where(and(eq(notifications.recipient_id, userId), eq(notifications.read, false)));
  return row?.count ?? 0;
}
