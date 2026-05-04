import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { reviewService } from "./review.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewService.create(req.user.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Review submitted",
    data: result,
  });
});

const listForProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewService.listForProduct(
    req.params.productId as string,
    req.query as any
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Reviews fetched",
    data: result.data,
    meta: result.meta,
  });
});

const moderate = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewService.moderate(
    req.params.id as string,
    req.body.status
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Review moderated",
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  const isAdmin = req.user?.role === "ADMIN" || req.user?.role === "STAFF";
  await reviewService.remove(req.user.userId, req.params.id as string, isAdmin);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Review deleted",
  });
});

export const reviewController = { create, listForProduct, moderate, remove };
