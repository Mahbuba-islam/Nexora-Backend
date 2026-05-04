/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import status from "http-status";
import { randomUUID } from "node:crypto";

import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { envVars } from "../../config/env";
import { cartService } from "./cart.service";

const GUEST_COOKIE = "nexora-cart";
const GUEST_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const isProd = () => envVars.NODE_ENV === "production";

const guestCookieOptions = () => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: isProd() ? ("none" as const) : ("lax" as const),
  path: "/",
  maxAge: GUEST_COOKIE_MAX_AGE_MS,
});

/**
 * Resolve the cart "owner" for this request.
 *
 * Logged in   → use userId, IGNORE the guest cookie for ownership. If a
 *               guest cookie exists, ask the service to merge its items
 *               into the user cart and clear the cookie afterwards.
 * Anonymous   → use the guest session cookie. If none, mint one so the
 *               same browser keeps its cart across requests.
 */
const resolveCartArgs = (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const guestToken =
    (req.cookies?.[GUEST_COOKIE] as string | undefined) ||
    (req.headers["x-cart-session"] as string | undefined);

  if (userId) {
    return {
      userId,
      mergeFromSessionToken: guestToken,
      onMerged: () =>
        res.clearCookie(GUEST_COOKIE, { ...guestCookieOptions(), maxAge: 0 }),
    };
  }

  let token = guestToken;
  if (!token) {
    token = randomUUID();
    res.cookie(GUEST_COOKIE, token, guestCookieOptions());
  }
  return { sessionToken: token };
};

const get = catchAsync(async (req: Request, res: Response) => {
  const result = await cartService.getCart(resolveCartArgs(req, res));
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Cart fetched",
    data: result,
  });
});

const addItem = catchAsync(async (req: Request, res: Response) => {
  const result = await cartService.addItem(resolveCartArgs(req, res), req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Item added to cart",
    data: result,
  });
});

const updateItem = catchAsync(async (req: Request, res: Response) => {
  const result = await cartService.updateItem(
    resolveCartArgs(req, res),
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
    resolveCartArgs(req, res),
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
  const result = await cartService.clearCart(resolveCartArgs(req, res));
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Cart cleared",
    data: result,
  });
});

const applyCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await cartService.applyCoupon(
    resolveCartArgs(req, res),
    req.body.code
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Coupon applied",
    data: result,
  });
});

const removeCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await cartService.removeCoupon(resolveCartArgs(req, res));
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
