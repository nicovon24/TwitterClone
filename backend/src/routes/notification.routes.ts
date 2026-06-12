import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import * as notificationService from '../services/notificationService.js';

const notificationRouter = Router();

// GET /notifications
notificationRouter.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const rawLimit = Number(req.query.limit);
  const limit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20;

  try {
    const result = await notificationService.getNotifications(req.user!.id, cursor, limit);
    res.status(200).json({ notifications: result.notifications, next_cursor: result.nextCursor });
  } catch (err: unknown) {
    const typed = err as { status?: number; message?: string };
    if (typed.status === 400) {
      res.status(400).json({ error: typed.message ?? 'Bad request' });
      return;
    }
    throw err;
  }
});

// GET /notifications/unread-count
notificationRouter.get('/unread-count', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const count = await notificationService.getUnreadCount(req.user!.id);
  res.status(200).json({ count });
});

// POST /notifications/read-all
notificationRouter.post('/read-all', requireAuth, async (req: Request, res: Response): Promise<void> => {
  await notificationService.markAllRead(req.user!.id);
  res.status(200).json({ message: 'All notifications marked as read' });
});

// POST /notifications/:id/read
notificationRouter.post('/:id/read', requireAuth, async (req: Request, res: Response): Promise<void> => {
  await notificationService.markRead(req.params.id, req.user!.id);
  res.status(200).json({ message: 'Notification marked as read' });
});

export default notificationRouter;
