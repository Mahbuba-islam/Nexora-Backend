import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { orderService } from "./order.service";

const checkout = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.checkout(req.user.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Order placed",
    data: result,
  });
});

const listMine = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.listForUser(req.user.userId, req.query as any);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Orders fetched",
    data: result.data,
    meta: result.meta,
  });
});

const listAll = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.listAll(req.query as any);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Orders fetched",
    data: result.data,
    meta: result.meta,
  });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const isStaff = req.user.role === "ADMIN" || req.user.role === "STAFF";
  const result = await orderService.getById(
    req.params.id as string,
    isStaff ? undefined : req.user.userId
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Order fetched",
    data: result,
  });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.updateStatus(
    req.params.id as string,
    req.body.status,
    req.user.userId,
    req.body.note
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Order status updated",
    data: result,
  });
});

const cancel = catchAsync(async (req: Request, res: Response) => {
  const result = await orderService.cancel(
    req.params.id as string,
    req.user.userId,
    req.body?.reason
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Order cancelled",
    data: result,
  });
});

export const orderController = {
  checkout,
  listMine,
  listAll,
  getById,
  updateStatus,
  cancel,
};
