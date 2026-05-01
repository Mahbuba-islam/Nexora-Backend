import type { NextFunction, Request, Response } from "express";
import { aiMetrics } from "./metrics";

/**
 * Logs every AI request and records in-memory metrics.
 * Controllers stash provider meta on `res.locals.aiMeta` via sendAIResponse.
 */
export const aiLogger = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  // Endpoint path relative to the AI router (e.g. "/chat").
  const endpoint = req.path || req.originalUrl;

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const meta = (res.locals.aiMeta ?? null) as
      | { model?: string; provider?: string; tokensUsed?: number; latencyMs?: number }
      | null;
    const ok = res.statusCode < 400;

    if (ok) {
      aiMetrics.recordSuccess(endpoint, durationMs, meta?.tokensUsed ?? 0);
    } else {
      aiMetrics.recordError(endpoint, durationMs, `HTTP ${res.statusCode}`);
    }

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        scope: "ai",
        endpoint,
        method: req.method,
        status: res.statusCode,
        durationMs,
        provider: meta?.provider ?? null,
        model: meta?.model ?? null,
        tokensUsed: meta?.tokensUsed ?? 0,
        modelLatencyMs: meta?.latencyMs ?? null,
        at: new Date().toISOString(),
      })
    );
  });

  next();
};
