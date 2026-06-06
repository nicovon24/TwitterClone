import type { Response } from 'express';

// In-memory registry: userId -> Set of active SSE Response objects
const connections = new Map<string, Set<Response>>();

/**
 * Register an SSE response for a user. Automatically removes the connection
 * when the client disconnects.
 */
export function addConnection(userId: string, res: Response): void {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(res);

  res.on('close', () => {
    removeConnection(userId, res);
  });
}

/**
 * Remove a specific SSE response for a user. Deletes the Map entry when the
 * user's Set becomes empty to avoid memory accumulation.
 */
export function removeConnection(userId: string, res: Response): void {
  const userConns = connections.get(userId);
  if (!userConns) return;

  userConns.delete(res);

  if (userConns.size === 0) {
    connections.delete(userId);
  }
}

/**
 * Broadcast a new_tweet event to all active SSE connections belonging to the
 * given list of follower IDs. Silently skips followers with no open connections.
 */
export function broadcastToFollowers(followerIds: string[], payload: object): void {
  const data = JSON.stringify(payload);
  const message = `event: new_tweet\ndata: ${data}\n\n`;

  for (const followerId of followerIds) {
    const userConns = connections.get(followerId);
    if (!userConns || userConns.size === 0) continue;

    for (const res of userConns) {
      try {
        res.write(message);
      } catch {
        // Connection may have closed between check and write; ignore
        removeConnection(followerId, res);
      }
    }
  }
}

/**
 * Start sending a periodic heartbeat on an SSE response to keep the
 * connection alive through proxies. Returns the interval handle so the
 * caller can call clearInterval on close.
 */
export function startHeartbeat(res: Response): NodeJS.Timeout {
  return setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      // Ignore write errors; cleanup is handled via res.on('close')
    }
  }, 30_000);
}
