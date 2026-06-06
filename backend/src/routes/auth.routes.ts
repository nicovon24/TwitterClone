import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import * as authService from '../services/authService.js';

const router = Router();

// Zod schemas for request validation
const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

// POST /auth/register
router.post('/register', async (req, res) => {
  const body = registerSchema.parse(req.body);
  const result = await authService.register(body);
  res.status(201).json(result);
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const body = loginSchema.parse(req.body);
  const result = await authService.login(body);
  res.status(200).json(result);
});

// POST /auth/logout  — protected
router.post('/logout', requireAuth, async (req, res) => {
  await authService.logout(req.user!.id);
  res.status(200).json({ message: 'Logged out' });
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const body = refreshSchema.parse(req.body);
  const result = await authService.refresh(body);
  res.status(200).json(result);
});

// GET /auth/me  — protected
router.get('/me', requireAuth, async (req, res) => {
  const user = await authService.me(req.user!.id);
  res.status(200).json(user);
});

export default router;
