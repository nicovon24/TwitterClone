import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  REFRESH_TOKEN_SECRET: z.string().min(1, 'REFRESH_TOKEN_SECRET is required'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const missingVars = result.error.issues
    .map((issue) => issue.path.join('.'))
    .join(', ');
  console.error(
    `[env] Missing or invalid environment variables: ${missingVars}\n` +
      `Please set the required variables before starting the server.`,
  );
  process.exit(1);
}

const env = result.data;

export default env;
