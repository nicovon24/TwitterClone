import { Router, Request, Response } from 'express';
import * as userService from '../services/userService.js';
import * as followService from '../services/followService.js';

const router = Router();

// GET /users/:username — public profile (no auth required)
router.get('/:username', async (req: Request, res: Response): Promise<void> => {
  const requesterId = req.user?.id;
  const profile = await userService.getProfile(req.params.username, requesterId);
  res.status(200).json(profile);
});

// GET /users/:username/followers — list followers (no auth required)
router.get('/:username/followers', async (req: Request, res: Response): Promise<void> => {
  const requesterId = req.user?.id;
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const result = await followService.getFollowers(req.params.username, requesterId, cursor, limit);
  res.status(200).json({ users: result.users, next_cursor: result.nextCursor });
});

// GET /users/:username/following — list following (no auth required)
router.get('/:username/following', async (req: Request, res: Response): Promise<void> => {
  const requesterId = req.user?.id;
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const result = await followService.getFollowing(req.params.username, requesterId, cursor, limit);
  res.status(200).json({ users: result.users, next_cursor: result.nextCursor });
});

export default router;
