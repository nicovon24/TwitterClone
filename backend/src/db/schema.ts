import { pgTable, uuid, varchar, text, timestamp, primaryKey, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    username: varchar('username', { length: 50 }).unique().notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    password_hash: text('password_hash').notNull(),
    display_name: varchar('display_name', { length: 100 }),
    bio: varchar('bio', { length: 160 }),
    avatar_url: text('avatar_url'),
    refresh_token_hash: text('refresh_token_hash'),
    refresh_token_expires_at: timestamp('refresh_token_expires_at'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    usernameIdx: index('users_username_idx').on(table.username),
  }),
);

export const tweets = pgTable(
  'tweets',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: varchar('content', { length: 280 }).notNull(),
    image_url: text('image_url'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    userCreatedAtIdx: index('tweets_user_id_created_at_idx').on(table.user_id, table.created_at),
    activeCreatedAtIdx: index('tweets_active_created_at_idx')
      .on(table.created_at)
      .where(sql`${table.deleted_at} IS NULL`),
  }),
);

export const follows = pgTable(
  'follows',
  {
    follower_id: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    following_id: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.follower_id, table.following_id] }),
    noSelfFollow: check('no_self_follow', sql`${table.follower_id} <> ${table.following_id}`),
    followingIdx: index('follows_following_id_idx').on(table.following_id),
  }),
);

export const likes = pgTable('likes', {
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tweet_id: uuid('tweet_id')
    .notNull()
    .references(() => tweets.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.user_id, table.tweet_id] }),
}));
