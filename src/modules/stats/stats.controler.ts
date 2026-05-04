import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { statsService } from "./stats.service";

const overview = catchAsync(async (_req: Request, res: Response) => {
  const result = await statsService.overview();
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Stats overview",
    data: result,
  });
});
const recentOrders = catchAsync(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 10;
  const result = await statsService.recentOrders(limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Recent orders",
    data: result,
  });
});
const topProducts = catchAsync(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 10;
  const result = await statsService.topProducts(limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Top products",
    data: result,
  });
});
const revenueByDay = catchAsync(async (req: Request, res: Response) => {
  const days = Number(req.query.days) || 14;
  const result = await statsService.revenueByDay(days);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Revenue by day",
    data: result,
  });
});

const marketplace = catchAsync(async (_req: Request, res: Response) => {
  const result = await statsService.marketplace();
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Marketplace KPIs",
    data: result,
  });
});

const topSellers = catchAsync(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 10;
  const result = await statsService.topSellers(limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Top sellers",
    data: result,
  });
});

const payoutPipeline = catchAsync(async (_req: Request, res: Response) => {
  const result = await statsService.payoutPipeline();
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payout pipeline",
    data: result,
  });
});

export const statsController = { overview, recentOrders, topProducts, revenueByDay, marketplace, topSellers, payoutPipeline };
