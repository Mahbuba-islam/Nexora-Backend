/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import status from "http-status";

import { authService } from "./auth.service";
import { tokenUtils } from "../../utilis/token";
import AppError from "../../errorHelpers/AppError";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { envVars } from "../../config/env";
import { CookieUtils } from "../../utilis/cookie";

const getBetterAuthSessionToken = (req: Request) =>
  req.cookies["better-auth.session_token"] ??
  req.cookies["__Secure-better-auth.session_token"];

const registeredUser = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.registerCustomer(req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Account created successfully. Please verify your email.",
    data: result,
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);
  const { accessToken, refreshToken, token, user, ...rest } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Login successful",
    data: { accessToken, refreshToken, token, user, ...rest },
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.getMe(req.user);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User profile fetched",
    data: result,
  });
});

const getNewToken = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  const baToken = getBetterAuthSessionToken(req);
  if (!refreshToken) throw new AppError(status.UNAUTHORIZED, "Refresh token missing");

  const r = await authService.getNewToken(refreshToken, baToken);
  tokenUtils.setAccessTokenCookie(res, r.accessToken);
  tokenUtils.setRefreshTokenCookie(res, r.refreshToken);
  if (r.sessionToken) tokenUtils.setBetterAuthSessionCookie(res, r.sessionToken);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Tokens refreshed",
    data: r,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.changePassword(req.body, {
    sessionToken: getBetterAuthSessionToken(req),
    authorizationHeader: req.headers.authorization,
    cookieHeader: req.headers.cookie,
    userId: req.user?.userId,
  });

  tokenUtils.setAccessTokenCookie(res, result.accessToken);
  tokenUtils.setRefreshTokenCookie(res, result.refreshToken);
  if (result.token) tokenUtils.setBetterAuthSessionCookie(res, result.token);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
});

const logOutUser = catchAsync(async (req: Request, res: Response) => {
  const baToken = getBetterAuthSessionToken(req);
  const result = await authService.logOutUser(baToken);

  const cookieNames = [
    "accessToken",
    "refreshToken",
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
  ];
  const variants = [
    { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
    { httpOnly: true, secure: false, sameSite: "lax" as const, path: "/" },
    { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
    { path: "/" },
    {},
  ];
  for (const name of cookieNames)
    for (const opts of variants) CookieUtils.clearCookie(res, name, opts);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Logged out",
    data: result,
  });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  await authService.verifyEmail(email, otp);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Email verified successfully",
  });
});

const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  await authService.forgetPassword(req.body.email);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password reset OTP sent",
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  await authService.resetPassword(email, otp, newPassword);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password reset successful",
  });
});

const googleLogin = catchAsync(async (_req: Request, res: Response) => {
  res.redirect(`${envVars.BETTER_AUTH_URL}/api/auth/sign-in/social?provider=google`);
});

const googleLoginSuccess = catchAsync(async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { accessToken, refreshToken } = await authService.googleLoginSuccess(session);

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);

  res.redirect(envVars.FRONTEND_URL);
});

const handlerOAuthError = catchAsync(async (_req: Request, res: Response) => {
  res.redirect(`${envVars.FRONTEND_URL}/login?error=oauth`);
});

const checkEmailAvailability = catchAsync(async (req: Request, res: Response) => {
  const email = String(req.query.email || "");
  const exists = await authService.checkEmailExists(email);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Email availability checked",
    data: { exists, available: !exists },
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.updateProfile(req.user, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile updated",
    data: result,
  });
});

const demoLogin = catchAsync(async (req: Request, res: Response) => {
  const raw = (req.body?.role ?? req.params?.role ?? req.query?.role ?? "").toString().toLowerCase();
  const role = raw as "customer" | "seller" | "admin";
  if (!(["customer", "seller", "admin"] as const).includes(role)) {
    throw new AppError(status.BAD_REQUEST, "role must be one of: customer, seller, admin");
  }

  const result = await authService.loginDemo(role);
  const { accessToken, refreshToken, token, user, ...rest } = result;

  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Demo ${role} login successful`,
    data: { accessToken, refreshToken, token, user, role, ...rest },
  });
});

export const authControler = {
  registeredUser,
  loginUser,
  getMe,
  getNewToken,
  changePassword,
  logOutUser,
  verifyEmail,
  forgetPassword,
  resetPassword,
  googleLogin,
  googleLoginSuccess,
  handlerOAuthError,
  checkEmailAvailability,
  updateProfile,
  demoLogin,
};
