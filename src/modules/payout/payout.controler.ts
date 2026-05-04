import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { Role } from "../../generated/enums";
import { payoutService } from "./payout.service";

const listMine = catchAsync(async (req: Request, res: Response) => {
  const result = await payoutService.listMine(
    req.user.userId,
    req.query as Record<string, unknown>
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payouts fetched",
    data: result.data,
    meta: result.meta,
  });
});

const listAll = catchAsync(async (req: Request, res: Response) => {
  const result = await payoutService.listAll(
    req.query as Record<string, unknown>
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payouts fetched",
    data: result.data,
    meta: result.meta,
  });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const result = await payoutService.getById(req.params.id as string, {
    userId: req.user.userId,
    role: req.user.role as Role,
  });
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payout fetched",
    data: result,
  });
});

const generate = catchAsync(async (req: Request, res: Response) => {
  const result = await payoutService.generatePayout(req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Payout generated",
    data: result,
  });
});

const markPaid = catchAsync(async (req: Request, res: Response) => {
  const result = await payoutService.markPaid(
    req.params.id as string,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payout marked paid",
    data: result,
  });
});

const markFailed = catchAsync(async (req: Request, res: Response) => {
  const result = await payoutService.markFailed(
    req.params.id as string,
    req.body.failureReason
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payout marked failed",
    data: result,
  });
});

export const payoutController = {
  listMine,
  listAll,
  getById,
  generate,
  markPaid,
  markFailed,
};
