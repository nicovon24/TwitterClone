import { db } from './index.js';
import { users } from './schema.js';

export async function seed(): Promise<void> {
  const existing = await db.select().from(users).limit(1);

  if (existing.length > 0) {
    console.log('[seed] Seed skipped: users already exist.');
    return;
  }

  // Full sample data (10 users, ~50 tweets, follows, likes) deferred to Phase 4 per ROADMAP Plan 4.1.
  // This placeholder establishes the idempotent seed entry point for docker startup.
  console.log('[seed] Seed placeholder — full sample data added in Phase 4.');
}

// Run directly when executed as a script
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seed.ts')) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] Seed failed:', err);
      process.exit(1);
    });
}
