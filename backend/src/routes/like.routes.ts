import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import * as likeService from '../services/likeService.js';

const router = Router();

// POST /likes/:tweetId — like a tweet
router.post('/:tweetId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const result = await likeService.likeTweet(req.user!.id, req.params.tweetId);
  res.status(201).json({ message: 'Tweet liked', likes_count: result.likes_count });
});

// DELETE /likes/:tweetId — unlike a tweet
router.delete('/:tweetId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const result = await likeService.unlikeTweet(req.user!.id, req.params.tweetId);
  res.status(200).json({ message: 'Tweet unliked', likes_count: result.likes_count });
});

export default router;
