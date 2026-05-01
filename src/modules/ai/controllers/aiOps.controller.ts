import type { Request, Response } from "express";
import { catchAsync } from "../../../shared/catchAsync";
import { aiProvider } from "../utils/aiProvider";
import { aiMetrics } from "../utils/metrics";

const health = catchAsync(async (_req: Request, res: Response) => {
  const probe = await aiProvider.ping();
  const httpStatus = probe.status === "ok" ? 200 : probe.status === "unconfigured" ? 503 : 503;
  res.status(httpStatus).json({
    success: probe.status === "ok",
    data: probe,
  });
});

const metrics = catchAsync(async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: aiMetrics.snapshot(),
  });
});

export const aiOpsController = { health, metrics };
