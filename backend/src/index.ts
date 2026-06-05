import env from './env.js';
import { runMigrations } from './db/migrate.js';
import app from './app.js';

async function bootstrap(): Promise<void> {
  await runMigrations();
  app.listen(env.PORT, () => {
    console.log(`[server] Backend listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

bootstrap().catch((err) => {
  console.error('[server] Bootstrap failed:', err);
  process.exit(1);
});
