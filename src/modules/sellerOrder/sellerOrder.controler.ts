import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { sellerOrderService } from "./sellerOrder.service";
import { Role, SellerOrderStatus } from "../../generated/enums";

const listMine = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerOrderService.listMine(
    req.user.userId,
    req.query as Record<string, unknown>
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller orders fetched",
    data: result.data,
    meta: result.meta,
  });
});

const listAll = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerOrderService.listAll(
    req.query as Record<string, unknown>
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller orders fetched",
    data: result.data,
    meta: result.meta,
  });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerOrderService.getById(req.params.id as string, {
    userId: req.user.userId,
    role: req.user.role as Role,
  });
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller order fetched",
    data: result,
  });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerOrderService.updateStatus(
    req.params.id as string,
    req.body.status as SellerOrderStatus,
    { userId: req.user.userId, role: req.user.role as Role },
    req.body.note
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Status updated",
    data: result,
  });
});

const addTracking = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerOrderService.addTracking(
    req.params.id as string,
    req.body,
    { userId: req.user.userId, role: req.user.role as Role }
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Tracking added",
    data: result,
  });
});

const cancel = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerOrderService.cancel(
    req.params.id as string,
    req.body.reason,
    { userId: req.user.userId, role: req.user.role as Role }
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Sub-order cancelled",
    data: result,
  });
});

export const sellerOrderController = {
  listMine,
  listAll,
  getById,
  updateStatus,
  addTracking,
  cancel,
};
