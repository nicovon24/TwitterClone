import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as userService from '../services/userService.js';
import * as followService from '../services/followService.js';
import * as tweetService from '../services/tweetService.js';
import { requireAuth, optionalAuth } from '../middleware/requireAuth.js';

const router = Router();

const updateProfileSchema = z.object({
  display_name: z.string().max(100).nullable().optional(),
  bio: z.string().max(160).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
});

// PATCH /users/me — update own profile (requires auth)
router.patch('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const updated = await userService.updateProfile(req.user!.id, parsed.data);
  res.status(200).json(updated);
});

// DELETE /users/me — delete own account (requires auth)
router.delete('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  await userService.deleteAccount(req.user!.id);
  res.status(200).json({ ok: true });
});

// GET /users/:username/tweets — list a user's tweets (auth optional)
router.get('/:username/tweets', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const requesterId = req.user?.id;
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  try {
    const result = await tweetService.getUserTweets(req.params.username, requesterId, cursor, limit);
    res.status(200).json({ tweets: result.tweets, next_cursor: result.nextCursor });
  } catch (err: unknown) {
    const typed = err as { status?: number };
    if (typed.status === 404) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    throw err;
  }
});

// GET /users/:username — public profile (auth optional, personalizes is_following)
router.get('/:username', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const requesterId = req.user?.id;
  const profile = await userService.getProfile(req.params.username, requesterId);
  res.status(200).json(profile);
});

// GET /users/:username/followers — list followers (auth optional, personalizes is_following)
router.get('/:username/followers', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const requesterId = req.user?.id;
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const result = await followService.getFollowers(req.params.username, requesterId, cursor, limit);
  res.status(200).json({ users: result.users, next_cursor: result.nextCursor });
});

// GET /users/:username/following — list following (auth optional, personalizes is_following)
router.get('/:username/following', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const requesterId = req.user?.id;
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const result = await followService.getFollowing(req.params.username, requesterId, cursor, limit);
  res.status(200).json({ users: result.users, next_cursor: result.nextCursor });
});

export default router;
