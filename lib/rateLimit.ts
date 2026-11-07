// Minimal fixed-window rate limiter. In-memory → per server instance only; replace with Upstash Redis
// (planned) before multi-instance deploys. Keys are hashed-free IP strings; nothing is persisted.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= limit) return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  b.count++;
  return { ok: true, retryAfterSec: 0 };
}

/** Best-effort client IP behind a proxy (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
}
