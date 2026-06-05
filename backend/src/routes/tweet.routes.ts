import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import * as tweetService from '../services/tweetService.js';
import { addConnection, removeConnection, startHeartbeat } from '../sse/sseManager.js';
import env from '../env.js';

// ---------------------------------------------------------------------------
// tweetRouter — POST / and DELETE /:id
// ---------------------------------------------------------------------------

export const tweetRouter = Router();

const createTweetSchema = z.object({
  content: z.string().min(1, 'Content is required').max(280, 'Content must be 280 chars or fewer'),
});

// POST /tweets
tweetRouter.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parseResult = createTweetSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0]?.message ?? 'Invalid body' });
    return;
  }

  const tweet = await tweetService.createTweet(req.user!.id, parseResult.data.content);
  res.status(201).json(tweet);
});

// DELETE /tweets/:id
tweetRouter.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await tweetService.softDeleteTweet(req.params.id, req.user!.id);
    res.status(200).json({ message: 'Tweet deleted' });
  } catch (err: unknown) {
    const typed = err as { status?: number; message?: string };
    if (typed.status === 403) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (typed.status === 404) {
      res.status(404).json({ error: 'Tweet not found' });
      return;
    }
    throw err; // let errorHandler handle unexpected errors
  }
});

// ---------------------------------------------------------------------------
// timelineRouter — GET / and GET /stream
// ---------------------------------------------------------------------------

export const timelineRouter = Router();

// GET /timeline
timelineRouter.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const rawLimit = Number(req.query.limit);
  const limit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20;

  try {
    const result = await tweetService.getTimeline(req.user!.id, cursor, limit);
    res.status(200).json({ tweets: result.tweets, next_cursor: result.nextCursor });
  } catch (err: unknown) {
    const typed = err as { status?: number; message?: string };
    if (typed.status === 400) {
      res.status(400).json({ error: typed.message ?? 'Bad request' });
      return;
    }
    throw err;
  }
});

// GET /timeline/stream — SSE endpoint; auth via ?token= query param because
// EventSource (browser) cannot send custom headers.
timelineRouter.get('/stream', (req: Request, res: Response): void => {
  const token = typeof req.query.token === 'string' ? req.query.token : undefined;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let userId: string;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string };
    userId = payload.id;
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Upgrade to SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  addConnection(userId, res);
  const interval = startHeartbeat(res);

  req.on('close', () => {
    clearInterval(interval);
    removeConnection(userId, res);
  });
});
