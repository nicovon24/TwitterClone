import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import * as userService from '../services/userService.js';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query must be at least 1 character'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /search/users — search users by username prefix (requireAuth)
router.get('/users', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.errors });
    return;
  }
  const { q, cursor, limit } = parsed.data;
  const result = await userService.searchUsers(q, req.user!.id, cursor, limit);
  res.status(200).json({ users: result.users, next_cursor: result.nextCursor });
});

export default router;
