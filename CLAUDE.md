# TwitterClone — CLAUDE.md

## Proyecto

Clon de Twitter full-stack. Backend REST + SSE, frontend Next.js con Zustand.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Express 4 + TypeScript |
| ORM | Drizzle 0.30 + PostgreSQL |
| Auth | JWT (access 15min) + refresh token 30d, bcryptjs |
| Real-time | SSE (Server-Sent Events) — NO WebSockets |
| Frontend | Next.js 14 App Router + TypeScript |
| Estado | Zustand 4 |
| HTTP client | Axios con interceptors de auto-refresh |
| Estilos | Tailwind CSS con CSS variables temáticas |
| Tests | Vitest + Supertest (backend), React Testing Library (frontend) |

## Estructura

```
TwitterClone/
├── backend/
│   ├── src/
│   │   ├── db/schema.ts          ← Drizzle tables (users, tweets, follows, likes, notifications)
│   │   ├── services/             ← Business logic
│   │   ├── routes/               ← Express routers
│   │   ├── sse/sseManager.ts     ← SSE connections registry
│   │   ├── middleware/           ← requireAuth, errorHandler
│   │   └── app.ts                ← Express app
│   └── drizzle/                  ← SQL migrations
└── frontend/
    └── src/
        ├── app/                  ← Next.js pages (App Router)
        ├── components/           ← UI components
        ├── store/                ← Zustand stores
        ├── hooks/                ← Custom hooks
        └── lib/api.ts            ← Axios instance
```

## Patrones clave

- **Soft delete**: tweets usan `deleted_at`, nunca DELETE real
- **Cursor pagination**: base64 de `(created_at, id)` para keyset pagination
- **SSE stream**: `GET /timeline/stream?token=<JWT>` — un stream por usuario autenticado, multiplexado para todos los eventos en tiempo real
- **Auth header**: `Authorization: Bearer <token>` en todos los endpoints protegidos
- **Self-notification guard**: `notificationService.createNotification` hace `if (actorId === recipientId) return` antes de insertar
- **Mention parsing**: regex `/(?<![a-zA-Z0-9_])@([a-zA-Z0-9_]{1,50})/g`

## DB Schema

```
users          → id, username, email, password_hash, display_name, bio, avatar_url, ...
tweets         → id, user_id, content, image_url, parent_tweet_id (nullable), created_at, deleted_at
follows        → follower_id, following_id (composite PK)
likes          → user_id, tweet_id (composite PK), created_at
notifications  → id, recipient_id, actor_id, type, tweet_id (nullable), read, created_at
```

## API endpoints

```
POST   /auth/register, /auth/login, /auth/logout, /auth/refresh
GET    /auth/me

POST   /tweets                   body: { content, image_url?, parent_tweet_id? }
GET    /tweets/:id
DELETE /tweets/:id
GET    /tweets/:id/replies        ← nuevo

GET    /timeline?feed=for-you|following&cursor=&limit=
GET    /timeline/stream?token=   ← SSE stream (eventos: new_tweet, notification)

GET    /users/:username
PATCH  /users/me
DELETE /users/me
GET    /users/:username/tweets
GET    /users/:username/followers
GET    /users/:username/following

POST   /follows/:username
DELETE /follows/:username

POST   /likes/:tweetId
DELETE /likes/:tweetId

GET    /search/users?q=&limit=

POST   /uploads/image
GET    /uploads/:filename

GET    /notifications            ← nuevo (cursor pagination)
GET    /notifications/unread-count  ← nuevo
POST   /notifications/read-all   ← nuevo
POST   /notifications/:id/read   ← nuevo
```

## Tipos TypeScript principales

```typescript
// Tweet con metadata
interface TweetWithUser {
  id: string
  content: string
  image_url: string | null
  created_at: Date
  parent_tweet_id: string | null
  replies_count: number
  user: { id: string; username: string; display_name: string | null; avatar_url: string | null }
  likes_count: number
  liked_by_me: boolean
}

// Notificación con actor
interface NotificationWithActor {
  id: string
  type: 'like' | 'follow' | 'reply' | 'mention'
  tweet_id: string | null
  read: boolean
  created_at: string
  actor: { id: string; username: string; display_name: string | null; avatar_url: string | null }
  tweet?: { id: string; content: string }
}
```

## Flujo de notificaciones

1. Acción ocurre (like, follow, reply, mention)
2. Servicio correspondiente llama `notificationService.createNotification()`
3. `createNotification` guarda en DB y llama `broadcastToUser(recipientId, 'notification', payload)`
4. El cliente recibe el evento SSE `notification` en `useTimelineStream`
5. El hook llama `prependNotification()` e `incrementUnread()` en `notificationStore`
6. `NotificationBell` muestra badge con el conteo

## Features implementadas (v1 — feat/app-1)

- [x] Auth (register, login, logout, refresh token)
- [x] Tweets (crear, eliminar soft, timeline for-you/following, cursor pagination)
- [x] Likes (like/unlike optimístico)
- [x] Follows (follow/unfollow, listas)
- [x] Búsqueda de usuarios
- [x] Upload de imágenes
- [x] SSE stream para new_tweet en tiempo real
- [x] Perfil de usuario (editar bio, avatar)
- [x] Dark/light theme

## En desarrollo (v2 — feat/app-v2)

- [ ] Notificaciones en tiempo real (like, follow, reply, mention) via SSE
- [ ] Tweet replies / hilos (`parent_tweet_id`)
- [ ] @Menciones con autocomplete en composer
- [ ] @Menciones renderizadas como links en tweets
- [ ] Página `/notifications` con badge en nav

## Convenciones de código

- Sin comentarios salvo que el WHY sea no obvio
- `throw { status: 4xx, message: '...' }` para errores HTTP en servicios
- `express-async-errors` atrapa errores async automáticamente
- Todos los selects de tweets incluyen `replies_count` via alias self-join
- Migrations: `backend/drizzle/000N_nombre.sql` — correr con `npm run db:migrate`
