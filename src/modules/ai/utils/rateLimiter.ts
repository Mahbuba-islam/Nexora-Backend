import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const getClientKey = (req: Request): string => {
  const userId = (req as Request & { user?: { id?: string } }).user?.id;
  if (userId) return `u:${userId}`;
  const xff = req.headers["x-forwarded-for"];
  const ip =
    (Array.isArray(xff) ? xff[0] : xff?.split(",")[0]?.trim()) || req.ip || "unknown";
  return `ip:${ip}`;
};

/**
 * Simple in-memory fixed-window rate limiter.
 * Suitable for single-process dev / small prod. For multi-instance, swap in Redis.
 */
export const rateLimit = (options: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}) => {
  const { windowMs, max, keyPrefix = "ai" } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${getClientKey(req)}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(max - 1));
      return next();
    }

    if (bucket.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded",
        retryAfter: retryAfterSec,
      });
    }

    bucket.count += 1;
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(max - bucket.count));
    next();
  };
};

// Periodic cleanup so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}, 60_000).unref?.();
