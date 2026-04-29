import { getEnv } from './env';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

// Edge-safe Redis: use Upstash REST client only.
// (Node `redis` package pulls in `node:*` modules and breaks Edge builds when imported transitively by middleware.)
let upstash: any | null = null;

function getUpstash() {
  if (upstash) return upstash;
  const env = getEnv();
  const url = env.REDIS_URL;
  if (!url) return null;

  try {
    const { Redis } = require('@upstash/redis');
    upstash = new Redis({ url });
    return upstash;
  } catch {
    return null;
  }
}

// In-memory fallback for development
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function cleanupInMemoryStore(): void {
  const now = Date.now();
  for (const [key, value] of Array.from(inMemoryStore.entries())) {
    if (now > value.resetAt) {
      inMemoryStore.delete(key);
    }
  }
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { windowMs, maxRequests, keyPrefix = 'rl' } = config;
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();
  const resetTime = now + windowMs;

  // Try Redis first
  const redis = getUpstash();

  if (redis) {
    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }
      const ttl = await redis.ttl(key);
      const remaining = Math.max(0, maxRequests - current);
      const actualResetTime = ttl > 0 ? now + ttl * 1000 : resetTime;

      return {
        success: current <= maxRequests,
        limit: maxRequests,
        remaining,
        resetTime: actualResetTime,
      };
    } catch (error) {
      console.error('Redis rate limit error, falling back to in-memory:', error);
    }
  }

  // Fall back to in-memory store
  cleanupInMemoryStore();

  const record = inMemoryStore.get(key);
  if (!record || now > record.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: resetTime });
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime,
    };
  }

  record.count++;
  inMemoryStore.set(key, record);

  return {
    success: record.count <= maxRequests,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - record.count),
    resetTime: record.resetAt,
  };
}

// Pre-configured rate limiters
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyPrefix: 'auth',
};

export const ADMIN_LOGIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  keyPrefix: 'admin_login',
};

export const SUBADMIN_LOGIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'subadmin_login',
};

export const SUPERADMIN_LOGIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'superadmin_login',
};

export const API_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyPrefix: 'api',
};

export const UPLOAD_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'upload',
};

// Helper to create a rate limit check function
export function createRateLimiter(config: RateLimitConfig) {
  return async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
    return rateLimit(identifier, config);
  };
}

// Clear rate limit for an identifier (e.g., after successful login)
export async function clearRateLimit(identifier: string, keyPrefix = 'auth'): Promise<void> {
  const redis = getUpstash();
  const key = `${keyPrefix}:${identifier}`;

  if (redis) {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Failed to clear rate limit from Redis:', error);
    }
  }

  // Also clear from in-memory store
  inMemoryStore.delete(key);
}