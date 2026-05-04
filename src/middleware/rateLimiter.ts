import rateLimit from "express-rate-limit";

/**
 * Generic API limiter — applied globally to /api/v1 to defend against
 * scraping and brute-force enumeration. Generous by design so honest
 * UIs are never throttled.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 600, // ~40 req/min per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down and try again shortly.",
  },
});

/**
 * Strict limiter for credential & sensitive endpoints (login, register,
 * password reset, email verification). Returns 429 quickly to slow
 * credential-stuffing attempts.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 sensitive ops per IP per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message:
      "Too many authentication attempts from this IP. Please wait 15 minutes and try again.",
  },
});

/**
 * Checkout limiter — protects /orders/checkout against duplicate-submit
 * storms and abusive automation creating zombie pending orders.
 */
export const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many checkout attempts. Please wait a moment and retry.",
  },
});
