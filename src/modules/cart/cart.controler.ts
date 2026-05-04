import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { cartService } from "./cart.service";

const getCartArgs = (req: Request) => ({
  userId: req.user?.userId,
  sessionToken: (req.cookies?.["nexora-cart"] as string | undefined) ||
    (req.headers["x-cart-session"] as string | undefined),
});

const get = catchAsync(async (req: Request, res: Response) => {
  const result = await cartService.getCart(getCartArgs(req));
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Cart fetched",
    data: result,
  });
});

const addItem = catchAsync(async (req: Request, res: Response) => {
  const result = await cartService.addItem(getCartArgs(req), req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Item added to cart",
    data: result,
  });
});

const updateItem = catchAsync(async (req: Request, res: Response) => {
  const result = await cartService.updateItem(
    getCartArgs(req),
    req.params.itemId as string,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Cart item updated",
    data: result,
  });
});

const removeItem = catchAsync(async (req: Request, res: Response) => {
  const result = await cartService.removeItem(
    getCartArgs(req),
    req.params.itemId as string
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Cart item removed",
    data: result,
  });
});

const clear = catchAsync(async (req: Request, res: Response) => {
  const result = await cartService.clearCart(getCartArgs(req));
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Cart cleared",
    data: result,
  });
});

const applyCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await cartService.applyCoupon(getCartArgs(req), req.body.code);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Coupon applied",
    data: result,
  });
});

const removeCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await cartService.removeCoupon(getCartArgs(req));
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Coupon removed",
    data: result,
  });
});

export const cartController = {
  get,
  addItem,
  updateItem,
  removeItem,
  clear,
  applyCoupon,
  removeCoupon,
};
