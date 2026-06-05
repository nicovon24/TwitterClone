import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import * as followService from '../services/followService.js';

const router = Router();

// POST /follows/:username — follow a user
router.post('/:username', requireAuth, async (req: Request, res: Response): Promise<void> => {
  await followService.follow(req.user!.id, req.params.username);
  res.status(201).json({ message: `Now following ${req.params.username}` });
});

// DELETE /follows/:username — unfollow a user
router.delete('/:username', requireAuth, async (req: Request, res: Response): Promise<void> => {
  await followService.unfollow(req.user!.id, req.params.username);
  res.status(200).json({ message: `Unfollowed ${req.params.username}` });
});

export default router;
