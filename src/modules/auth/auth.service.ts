/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import { JwtPayload } from "jsonwebtoken";

import AppError from "../../errorHelpers/AppError";
import { tokenUtils } from "../../utilis/token";
import { jwtUtils } from "../../utilis/jwt";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { envVars } from "../../config/env";
import { Role, UserStatus } from "../../generated/enums";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import {
  IChangePasswordPayload,
  ILoginUserPayload,
  IRegisterCustomerPayload,
  IUpdateProfilePayload,
} from "./auth.interface";

type BetterAuthLikeError = {
  status?: string;
  statusCode?: number;
  body?: { message?: string; code?: string };
  message?: string;
};

const isBetterAuthLikeError = (error: unknown): error is BetterAuthLikeError => {
  if (!error || typeof error !== "object") return false;
  const c = error as BetterAuthLikeError;
  return (
    typeof c.statusCode === "number" ||
    typeof c.status === "string" ||
    typeof c.body?.message === "string"
  );
};

const mapBetterAuthError = (error: unknown, fallbackMessage: string) => {
  if (!isBetterAuthLikeError(error)) return null;
  const message = error.body?.message || error.message || fallbackMessage;
  const statusCode =
    typeof error.statusCode === "number"
      ? error.statusCode
      : error.status === "UNAUTHORIZED"
        ? status.UNAUTHORIZED
        : status.BAD_REQUEST;
  return new AppError(statusCode, message);
};

// ----------------- Register Customer -----------------
const registerCustomer = async (payload: IRegisterCustomerPayload) => {
  const { fullName, email, password } = payload;

  const data = await auth.api.signUpEmail({
    body: { name: fullName, email, password },
  });

  if (!data.user) {
    throw new AppError(status.BAD_REQUEST, "Failed to register user");
  }

  await prisma.user.update({
    where: { id: data.user.id },
    data: { role: Role.CUSTOMER },
  });

  const customer = await prisma.$transaction(async (tx) => {
    try {
      const profile = await tx.customer.create({
        data: { userId: data.user.id, fullName, email },
      });
      await tx.wishlist.create({ data: { userId: data.user.id } });
      return profile;
    } catch (err) {
      await prisma.user.delete({ where: { id: data.user.id } });
      throw err;
    }
  });

  const tokenPayload = {
    userId: data.user.id,
    email: data.user.email,
    name: data.user.name,
    role: Role.CUSTOMER,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  };

  return {
    ...data,
    accessToken: tokenUtils.getAccessToken(tokenPayload),
    refreshToken: tokenUtils.getRefreshToken(tokenPayload),
    customer,
  };
};

// ----------------- Login -----------------
const loginUser = async (payload: ILoginUserPayload) => {
  const { email, password } = payload;

  const data = await auth.api
    .signInEmail({ body: { email, password } })
    .catch((error) => {
      const mapped = mapBetterAuthError(error, "Invalid email or password");
      if (mapped) throw mapped;
      throw error;
    });

  if (data.user.status === UserStatus.BLOCKED) {
    throw new AppError(status.FORBIDDEN, "User is blocked");
  }
  if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
    throw new AppError(status.FORBIDDEN, "User is deleted");
  }

  const tokenPayload = {
    userId: data.user.id,
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  };

  return {
    ...data,
    accessToken: tokenUtils.getAccessToken(tokenPayload),
    refreshToken: tokenUtils.getRefreshToken(tokenPayload),
  };
};

// ----------------- Get Me -----------------
const getMe = async (user: IRequestUser) => {
  const isUserExists = await prisma.user.findUnique({
    where: { id: user.userId },
    include: {
      customer: true,
      admin: true,
      addresses: { where: { isDeleted: false }, orderBy: { isDefault: "desc" } },
    },
  });

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }
  return isUserExists;
};

// ----------------- Refresh Token -----------------
const getNewToken = async (refreshToken: string, sessionToken?: string) => {
  const verified = jwtUtils.verifyToken(refreshToken, envVars.REFRESH_TOKEN_SECRET);
  if (!verified.success) {
    throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
  }

  const data = verified.data as JwtPayload;
  if (!data?.userId) {
    throw new AppError(status.UNAUTHORIZED, "Invalid refresh token payload");
  }

  const userRecord = await prisma.user.findUnique({ where: { id: data.userId } });
  if (
    !userRecord ||
    userRecord.isDeleted ||
    userRecord.status === UserStatus.DELETED ||
    userRecord.status === UserStatus.BLOCKED
  ) {
    throw new AppError(status.UNAUTHORIZED, "User is not authorized");
  }

  let nextSessionToken: string | null = null;
  if (sessionToken) {
    try {
      const baSession = await auth.api.getSession({
        headers: { Cookie: `better-auth.session_token=${sessionToken}` } as any,
      });
      if (baSession?.session && baSession.user?.id === userRecord.id) {
        await prisma.session
          .update({
            where: { token: baSession.session.token },
            data: {
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              updatedAt: new Date(),
            },
          })
          .catch(() => null);
        nextSessionToken = sessionToken;
      }
    } catch {
      nextSessionToken = null;
    }
  }

  const payload = {
    userId: userRecord.id,
    email: userRecord.email,
    name: userRecord.name,
    role: userRecord.role,
    status: userRecord.status,
    isDeleted: userRecord.isDeleted,
    emailVerified: userRecord.emailVerified,
  };

  return {
    accessToken: tokenUtils.getAccessToken(payload),
    refreshToken: tokenUtils.getRefreshToken(payload),
    sessionToken: nextSessionToken,
  };
};

// ----------------- Change Password -----------------
const changePassword = async (
  payload: IChangePasswordPayload,
  authContext: {
    sessionToken?: string;
    authorizationHeader?: string;
    cookieHeader?: string;
    userId?: string;
  }
) => {
  const { sessionToken, authorizationHeader, cookieHeader, userId } = authContext;

  const buildHeaders = (token?: string) => {
    const headerInit: Record<string, string> = {};
    if (authorizationHeader) headerInit.Authorization = authorizationHeader;
    else if (token) headerInit.Authorization = `Bearer ${token}`;
    if (cookieHeader) headerInit.Cookie = cookieHeader;
    else if (token)
      headerInit.Cookie = `better-auth.session_token=${token}; __Secure-better-auth.session_token=${token}`;
    return new Headers(headerInit);
  };

  if (!sessionToken && !authorizationHeader && !cookieHeader && !userId) {
    throw new AppError(status.UNAUTHORIZED, "Session expired. Please login again.");
  }

  let authHeaders = buildHeaders(sessionToken);
  let session = await auth.api.getSession({ headers: authHeaders }).catch(() => null);

  if (!session?.user && userId) {
    const activeSession = await prisma.session.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { updatedAt: "desc" },
    });
    if (activeSession?.token) {
      authHeaders = buildHeaders(activeSession.token);
      session = await auth.api.getSession({ headers: authHeaders }).catch(() => null);
    }
  }

  if (!session?.user) {
    throw new AppError(status.UNAUTHORIZED, "Invalid session token. Please login again.");
  }

  const { currentPassword, newPassword } = payload;
  if (currentPassword && currentPassword === newPassword) {
    throw new AppError(status.BAD_REQUEST, "New password must differ from current");
  }

  const credentialAccount = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "credential" },
  });

  let result;
  if (credentialAccount?.password) {
    if (!currentPassword) {
      throw new AppError(status.BAD_REQUEST, "Current password is required");
    }
    result = await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: authHeaders,
    });
  } else {
    result = await auth.api.setPassword({
      body: { newPassword },
      headers: authHeaders,
    });
  }

  if (session.user.needPasswordChange) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { needPasswordChange: false },
    });
  }

  const updatedUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!updatedUser) throw new AppError(status.NOT_FOUND, "User not found");

  const tokenPayload = {
    userId: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
    status: updatedUser.status,
    isDeleted: updatedUser.isDeleted,
    emailVerified: updatedUser.emailVerified,
  };

  const betterAuthToken = "token" in result ? (result as any).token : null;

  return {
    status: true,
    token: betterAuthToken,
    user: updatedUser,
    accessToken: tokenUtils.getAccessToken(tokenPayload),
    refreshToken: tokenUtils.getRefreshToken(tokenPayload),
  };
};

// ----------------- Logout -----------------
const logOutUser = async (sessionToken: string) => {
  return auth.api.signOut({
    headers: new Headers({ Authorization: `Bearer ${sessionToken}` }),
  });
};

// ----------------- Email OTP / Reset -----------------
const verifyEmail = async (email: string, otp: string) => {
  const result = await auth.api.verifyEmailOTP({ body: { email, otp } });
  if (result.status && !result.user.emailVerified) {
    await prisma.user.update({ where: { email }, data: { emailVerified: true } });
  }
};

const forgetPassword = async (email: string) => {
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) throw new AppError(status.NOT_FOUND, "User not found");
  if (!u.emailVerified) throw new AppError(status.BAD_REQUEST, "Email not verified");
  if (u.isDeleted || u.status === UserStatus.DELETED)
    throw new AppError(status.NOT_FOUND, "User not found");
  await auth.api.requestPasswordResetEmailOTP({ body: { email } });
};

const resetPassword = async (email: string, otp: string, newPassword: string) => {
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) throw new AppError(status.NOT_FOUND, "User not found");
  if (!u.emailVerified) throw new AppError(status.BAD_REQUEST, "Email not verified");
  if (u.isDeleted || u.status === UserStatus.DELETED)
    throw new AppError(status.NOT_FOUND, "User not found");

  const result = await auth.api.resetPasswordEmailOTP({
    body: { email, otp, password: newPassword },
  });
  if (!result?.success) {
    throw new AppError(status.BAD_REQUEST, "Password reset failed");
  }

  if (u.needPasswordChange) {
    await prisma.user.update({
      where: { id: u.id },
      data: { needPasswordChange: false },
    });
  }

  await prisma.session.deleteMany({ where: { userId: u.id } });
};

// ----------------- Google OAuth Hook -----------------
const googleLoginSuccess = async (session: Record<string, any>) => {
  const exists = await prisma.customer.findUnique({
    where: { userId: session.user.id },
  });
  if (!exists) {
    await prisma.customer.create({
      data: {
        userId: session.user.id,
        fullName: session.user.name,
        email: session.user.email,
      },
    });
    await prisma.wishlist
      .create({ data: { userId: session.user.id } })
      .catch(() => null);
  }

  const accessToken = tokenUtils.getAccessToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
  });
  const refreshToken = tokenUtils.getRefreshToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
  });

  return { accessToken, refreshToken };
};

// ----------------- Email Availability -----------------
const checkEmailExists = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  return !!user;
};

// ----------------- Update Profile -----------------
const updateProfile = async (user: IRequestUser, payload: IUpdateProfilePayload) => {
  const updatedUser = await prisma.user.update({
    where: { id: user.userId },
    data: {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.email !== undefined ? { email: payload.email } : {}),
      ...(payload.image !== undefined ? { image: payload.image } : {}),
    },
  });

  if (updatedUser.role === Role.CUSTOMER) {
    await prisma.customer.update({
      where: { userId: user.userId },
      data: {
        ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
        ...(payload.email !== undefined ? { email: payload.email } : {}),
      },
    });
  }

  return updatedUser;
};

export const authService = {
  registerCustomer,
  loginUser,
  getMe,
  getNewToken,
  changePassword,
  logOutUser,
  verifyEmail,
  forgetPassword,
  resetPassword,
  googleLoginSuccess,
  checkEmailExists,
  updateProfile,
};
