import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { refundService } from "./refund.service";

const request = catchAsync(async (req: Request, res: Response) => {
  const result = await refundService.requestRefund(req.user.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Refund requested",
    data: result,
  });
});

const approve = catchAsync(async (req: Request, res: Response) => {
  const result = await refundService.approveRefund(
    req.params.id as string,
    { userId: req.user.userId, role: req.user.role },
    req.body ?? {}
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Refund approved — processing",
    data: result,
  });
});

const reject = catchAsync(async (req: Request, res: Response) => {
  const result = await refundService.rejectRefund(
    req.params.id as string,
    { userId: req.user.userId, role: req.user.role },
    req.body ?? {}
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Refund rejected",
    data: result,
  });
});

const reprocess = catchAsync(async (req: Request, res: Response) => {
  const result = await refundService.processRefund(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Refund processed",
    data: result,
  });
});

const listMine = catchAsync(async (req: Request, res: Response) => {
  const result = await refundService.listMine(req.user.userId, req.query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Refunds fetched",
    data: result.data,
    meta: result.meta,
  });
});

const listSeller = catchAsync(async (req: Request, res: Response) => {
  const result = await refundService.listForSeller(req.user.userId, req.query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller refunds fetched",
    data: result.data,
    meta: result.meta,
  });
});

const listAll = catchAsync(async (req: Request, res: Response) => {
  const result = await refundService.listAll(req.query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Refunds fetched",
    data: result.data,
    meta: result.meta,
  });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const result = await refundService.getById(req.params.id as string, {
    userId: req.user.userId,
    role: req.user.role,
  });
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Refund fetched",
    data: result,
  });
});

export const refundController = {
  request,
  approve,
  reject,
  reprocess,
  listMine,
  listSeller,
  listAll,
  getById,
};
