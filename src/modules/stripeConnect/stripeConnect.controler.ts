import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { stripeConnectService } from "./stripeConnect.service";

const createOnboardingLink = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeConnectService.createOnboardingLink(
    req.user.userId,
    req.body ?? {}
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Stripe onboarding link created",
    data: result,
  });
});

const refreshStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeConnectService.refreshStatus(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Stripe Connect status refreshed",
    data: result,
  });
});

const loginLink = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeConnectService.createLoginLink(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Stripe dashboard login link",
    data: result,
  });
});

const transferPayout = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeConnectService.transferPayout(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Stripe transfer initiated",
    data: result,
  });
});

export const stripeConnectController = {
  createOnboardingLink,
  refreshStatus,
  loginLink,
  transferPayout,
};
