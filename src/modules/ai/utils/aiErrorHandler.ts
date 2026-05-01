import type { NextFunction, Request, Response } from "express";
import status from "http-status";
import AppError from "../../../errorHelpers/AppError";

/**
 * AI-scoped error normalizer. Standardizes 503 responses for provider issues so
 * the global handler doesn't leak stack traces or alternate shapes.
 * Mounted last on the AI router; lets non-AI errors bubble to globalErrorHandler.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const aiErrorHandler = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError && err.statusCode === status.SERVICE_UNAVAILABLE) {
    return res.status(503).json({
      success: false,
      message: "AI provider unavailable",
      detail: err.message,
    });
  }

  if (err instanceof AppError && err.statusCode === status.BAD_GATEWAY) {
    return res.status(503).json({
      success: false,
      message: "AI provider unavailable",
      detail: err.message,
    });
  }

  return next(err);
};
