-- Add parent_tweet_id to tweets (self-referential reply support)
ALTER TABLE "tweets" ADD COLUMN "parent_tweet_id" uuid
  REFERENCES "tweets"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "tweets_parent_tweet_id_idx"
  ON "tweets" ("parent_tweet_id") WHERE "parent_tweet_id" IS NOT NULL;

-- Notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipient_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "actor_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(20) NOT NULL,
  "tweet_id" uuid REFERENCES "tweets"("id") ON DELETE CASCADE,
  "read" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "notifications_recipient_id_idx"
  ON "notifications" ("recipient_id", "created_at" DESC);
