/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";

import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { Role, UserStatus } from "../generated/enums";
import { envVars } from "../config/env";
import { CookieUtils } from "../utilis/cookie";
import { jwtUtils } from "../utilis/jwt";

/**
 * Best-effort auth: populates `req.user` when a valid token is present,
 * otherwise leaves it undefined and calls `next()` without throwing.
 *
 * Used by routes that work for both guests and logged-in users (e.g. cart,
 * coupon validate). When the user is logged in, the route handler MUST
 * scope the resource by `req.user.userId` and never trust a guest cookie
 * — otherwise two users sharing a stale guest cookie would see the same
 * cart.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : undefined;
    const cookieToken = CookieUtils.getCookie(req, "accessToken");
    const accessToken = bearerToken || cookieToken;

    let userId: string | null = null;

    if (accessToken) {
      const verified = jwtUtils.verifyToken(accessToken, envVars.ACCESS_TOKEN_SECRET);
      if (verified.success && verified.data?.userId) {
        userId = String(verified.data.userId);
      }
    }

    if (!userId) {
      const baSessionToken =
        CookieUtils.getCookie(req, "better-auth.session_token") ||
        CookieUtils.getCookie(req, "__Secure-better-auth.session_token");

      if (baSessionToken || authHeader) {
        const cookieHeader = req.headers.cookie || [
          baSessionToken ? `better-auth.session_token=${baSessionToken}` : "",
          baSessionToken ? `__Secure-better-auth.session_token=${baSessionToken}` : "",
        ]
          .filter(Boolean)
          .join("; ");
        const session = await auth.api
          .getSession({
            headers: {
              ...(cookieHeader ? { cookie: cookieHeader } : {}),
              ...(authHeader ? { authorization: authHeader } : {}),
            },
          })
          .catch(() => null);
        if (session?.user?.id) userId = session.user.id;
      }
    }

    if (userId) {
      const user = await prisma.user
        .findUnique({ where: { id: userId } })
        .catch(() => null);
      if (
        user &&
        !user.isDeleted &&
        user.status !== UserStatus.BLOCKED &&
        user.status !== UserStatus.DELETED
      ) {
        req.user = {
          userId: user.id,
          role: user.role as Role,
          email: user.email,
        };
      }
    }
  } catch {
    // swallow — guests are allowed
  }
  next();
};
