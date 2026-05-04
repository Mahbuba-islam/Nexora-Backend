import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { wishlistService } from "./wishlist.service";

const get = catchAsync(async (req: Request, res: Response) => {
  const result = await wishlistService.getOrCreate(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Wishlist fetched",
    data: result,
  });
});
const addItem = catchAsync(async (req: Request, res: Response) => {
  const result = await wishlistService.addItem(req.user.userId, req.body.productId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Added to wishlist",
    data: result,
  });
});
const removeItem = catchAsync(async (req: Request, res: Response) => {
  const result = await wishlistService.removeItem(
    req.user.userId,
    req.params.productId as string
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Removed from wishlist",
    data: result,
  });
});

export const wishlistController = { get, addItem, removeItem };
