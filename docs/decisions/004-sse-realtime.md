# 004 — Real-time: Server-Sent Events (no WebSockets)

## Status
Accepted

## Context
The challenge includes a bonus for real-time timeline updates when other users post tweets. WebSockets and Server-Sent Events (SSE) were evaluated. The use case is **unidirectional**: the server notifies the client, the client does not need to send messages back over the same channel.

## Decision
- **SSE** (`EventSource` browser API) is used instead of WebSockets.
- Endpoint: `GET /timeline/stream` — the server keeps the connection open.
- The backend maintains a `Set<Response>` of active SSE clients per user.
- When a tweet is created, the server broadcasts to the SSE clients in the author's followers' timelines.
- The auth token is passed as a query param `?token=` (since `EventSource` does not support custom headers) or read automatically from the cookie if present.
- The frontend uses a `useTimelineStream` hook with `new EventSource(url)`.

## Consequences

**Advantages:**
- No upgrade handshake — works over standard HTTP/1.1.
- The browser handles automatic reconnection with `retry`.
- Simpler implementation than WebSockets: no additional library required.
- Perfect for the unidirectional use case (server → client).

**Disadvantages:**
- Not bidirectional: if real-time messaging (DMs) were needed, WebSockets would be required.
- Requires long-lived HTTP connections; at scale would need a broker (Redis Pub/Sub).
- `EventSource` does not support custom headers, forcing the token into a query param or cookie.

## Date
2026-06-04
