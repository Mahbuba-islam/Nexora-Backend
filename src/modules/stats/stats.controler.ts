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

const ordersTimeseries = catchAsync(async (req: Request, res: Response) => {
  const days = Number(req.query.days) || 30;
  const result = await statsService.ordersTimeseries(days);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Orders timeseries",
    data: result,
  });
});

const salesByCategory = catchAsync(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 10;
  const result = await statsService.salesByCategory(limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Sales by category",
    data: result,
  });
});

const customerAcquisition = catchAsync(async (req: Request, res: Response) => {
  const days = Number(req.query.days) || 30;
  const result = await statsService.customerAcquisition(days);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Customer acquisition",
    data: result,
  });
});

const refundMetrics = catchAsync(async (_req: Request, res: Response) => {
  const result = await statsService.refundMetrics();
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Refund metrics",
    data: result,
  });
});

const topCustomers = catchAsync(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 10;
  const result = await statsService.topCustomers(limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Top customers",
    data: result,
  });
});

const conversionFunnel = catchAsync(async (req: Request, res: Response) => {
  const days = Number(req.query.days) || 30;
  const result = await statsService.conversionFunnel(days);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Conversion funnel",
    data: result,
  });
});

const inventoryHealth = catchAsync(async (_req: Request, res: Response) => {
  const result = await statsService.inventoryHealth();
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Inventory health",
    data: result,
  });
});

export const statsController = {
  overview,
  recentOrders,
  topProducts,
  revenueByDay,
  marketplace,
  topSellers,
  payoutPipeline,
  ordersTimeseries,
  salesByCategory,
  customerAcquisition,
  refundMetrics,
  topCustomers,
  conversionFunnel,
  inventoryHealth,
};
