import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  retryAfterMs: number | null;
}

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;
  if (!url || !token) {
    warnOnce(
      "Upstash Redis not configured — rate limiting is bypassed. Set UPSTASH_REDIS_URL/UPSTASH_REDIS_TOKEN before production (NFR-3)."
    );
    redis = null;
  } else {
    redis = new Redis({ url, token });
  }
  return redis;
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(bucket: string, limit: number, windowMs: number): Ratelimit | null {
  const existing = limiters.get(bucket);
  if (existing) return existing;
  const client = getRedis();
  if (!client) return null;
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    prefix: `rl:${bucket}`,
    analytics: false,
  });
  limiters.set(bucket, limiter);
  return limiter;
}

export async function rateLimit(opts: {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const limiter = getLimiter(opts.bucket, opts.limit, opts.windowMs);
  if (!limiter) {
    return { success: true, limit: opts.limit, remaining: opts.limit, retryAfterMs: null };
  }
  const res = await limiter.limit(`${opts.bucket}:${opts.key}`);
  return {
    success: res.success,
    limit: opts.limit,
    remaining: res.remaining,
    retryAfterMs: res.success ? null : Math.max(0, res.reset - Date.now()),
  };
}

let warned = false;
function warnOnce(msg: string): void {
  if (warned) return;
  warned = true;
  console.warn(`[rate-limit] ${msg}`);
}
