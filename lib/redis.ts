/**
 * Singleton ioredis client for cache / rate limits (S2+).
 * Returns null when REDIS_URL is unset — callers fall back to DB-only paths.
 */

import Redis from 'ioredis';

let client: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return null;
  }
  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
    client.on('error', (err) => {
      console.error('[redis] connection error', err.message);
    });
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => {});
    client = null;
  }
}
