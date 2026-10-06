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

// Dev/test multiplier so the E2E suite (30+ logins per run) isn't throttled by the
// production limits (auth:login:ip = 10/15m). FORCED to 1 when NODE_ENV=production.
const SCALE = ((): number => {
  const raw = Number.parseInt(process.env.RATE_LIMIT_SCALE ?? "", 10);
  const scale = Number.isFinite(raw) && raw > 0 && raw <= 10_000 ? raw : 1;
  return process.env.NODE_ENV === "production" ? 1 : scale;
})();

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
  if (SCALE !== 1) warnOnce(`RATE_LIMIT_SCALE=${SCALE} active (dev/test only; production forces 1)`);
  const limiter = getLimiter(opts.bucket, opts.limit * SCALE, opts.windowMs);
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
