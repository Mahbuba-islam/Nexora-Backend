// // /* eslint-disable @typescript-eslint/no-explicit-any */
// import { NextFunction, Request, Response } from "express";
// import status from "http-status";




// import { prisma } from "../lib/prisma";
// import AppError from "../errorHelpers/AppError";
// import { Role, UserStatus } from "../generated/enums";
// import { envVars } from "../config/env";
// import { CookieUtils } from "../utilis/cookie";
// import { jwtUtils } from "../utilis/jwt";

// export const checkAuth = (...authRoles: Role[]) => async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         //Session Token Verification
//         const sessionToken = CookieUtils.getCookie(req, "better-auth.session_token");
//          console.log(sessionToken);
//         if (!sessionToken) {
//             throw new Error('Unauthorized access! No session token provided.');
//         }

//         if (sessionToken) {
//             const sessionExists = await prisma.session.findFirst({
//                 where: {
//                     token: sessionToken,
//                     expiresAt: {
//                         gt: new Date(),
//                     }
//                 },
//                 include: {
//                     user: true,
//                 }
//             })

//             if (sessionExists && sessionExists.user) {
//                 const user = sessionExists.user;

//                 const now = new Date();
//                 const expiresAt = new Date(sessionExists.expiresAt)
//                 const createdAt = new Date(sessionExists.createdAt)

//                 const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
//                 const timeRemaining = expiresAt.getTime() - now.getTime();
//                 const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

//                 if (percentRemaining < 20) {
//                     res.setHeader('X-Session-Refresh', 'true');
//                     res.setHeader('X-Session-Expires-At', expiresAt.toISOString());
//                     res.setHeader('X-Time-Remaining', timeRemaining.toString());

//                     console.log("Session Expiring Soon!!");
//                 }

//                 if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED) {
//                     throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! User is not active.');
//                 }

//                 if (user.isDeleted) {
//                     throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! User is deleted.');
//                 }

//                 if (authRoles.length > 0 && !authRoles.includes(user.role)) {
//                     throw new AppError(status.FORBIDDEN, 'Forbidden access! You do not have permission to access this resource.');
//                 }

//                 req.user = {
//                     userId : user.id,
//                     role : user.role,
//                     email : user.email,
//                 }
//             }

//             const accessToken = CookieUtils.getCookie(req, 'accessToken');

//             if (!accessToken) {
//                 throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! No access token provided.');
//             }


//         }

//         //Access Token Verification
//         const accessToken = CookieUtils.getCookie(req, 'accessToken');

//         if (!accessToken) {
//             throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! No access token provided.');
//         }

//         const verifiedToken = jwtUtils.verifyToken(accessToken, envVars.ACCESS_TOKEN_SECRET);

//         if (!verifiedToken.success) {
//             throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! Invalid access token.');
//         }

//         if (authRoles.length > 0 && !authRoles.includes(verifiedToken.data!.role as Role)) {
//             throw new AppError(status.FORBIDDEN, 'Forbidden access! You do not have permission to access this resource.');
//         }

//         next()
//     } catch (error: any) {
//         next(error);
//     }
// };



import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import AppError from "../errorHelpers/AppError";
import { Role, UserStatus } from "../generated/enums";
import { envVars } from "../config/env";
import { CookieUtils } from "../utilis/cookie";
import { jwtUtils } from "../utilis/jwt";
import { tokenUtils } from "../utilis/token";

export const checkAuth =
  (...authRoles: Role[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : undefined;
      const cookieToken = CookieUtils.getCookie(req, "accessToken");
      // Prefer the explicit Bearer token over the cookie. For an API, the
      // caller's explicit Authorization header should always win over an
      // ambient session cookie. This avoids "ghost identity" bugs where a
      // stale BetterAuth session cookie causes the server to authenticate
      // as the wrong user even though the client sent a fresh Bearer
      // token.
      const accessToken = bearerToken || cookieToken;

      const betterAuthSessionToken =
        CookieUtils.getCookie(req, "better-auth.session_token") ||
        CookieUtils.getCookie(req, "__Secure-better-auth.session_token");

      let userId: string | null = null;
      let betterAuthSession:
        | Awaited<ReturnType<typeof auth.api.getSession>>
        | null = null;

      if (accessToken) {
        const verified = jwtUtils.verifyToken(accessToken, envVars.ACCESS_TOKEN_SECRET);

        if (verified.success && verified.data?.userId) {
          userId = String(verified.data.userId);
        }
      }

      if (!userId && (betterAuthSessionToken || authHeader)) {
        const fallbackCookieHeader = req.headers.cookie || [
          betterAuthSessionToken
            ? `better-auth.session_token=${betterAuthSessionToken}`
            : "",
          betterAuthSessionToken
            ? `__Secure-better-auth.session_token=${betterAuthSessionToken}`
            : "",
        ]
          .filter(Boolean)
          .join("; ");

        betterAuthSession = await auth.api
          .getSession({
            headers: {
              ...(fallbackCookieHeader ? { cookie: fallbackCookieHeader } : {}),
              ...(authHeader ? { authorization: authHeader } : {}),
            },
          })
          .catch(() => null);

        if (betterAuthSession?.user?.id) {
          userId = betterAuthSession.user.id;
        }
      }

      if (!userId) {
        throw new AppError(
          status.UNAUTHORIZED,
          `Unauthorized! No access token. Route: ${req.method} ${req.originalUrl}. Send cookie or Bearer token.`
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized! User not found.");
      }

      const userRole = user.role as Role;

      if (
        user.status === UserStatus.BLOCKED ||
        user.status === UserStatus.DELETED ||
        user.isDeleted
      ) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized! User inactive.");
      }

      if (authRoles.length > 0 && !authRoles.includes(userRole)) {
        throw new AppError(
          status.FORBIDDEN,
          `Forbidden! No permission. Current role: ${userRole}. Allowed roles: ${authRoles.join(", ")}. Route: ${req.method} ${req.originalUrl}`
        );
      }

      if (!cookieToken && betterAuthSession?.user?.id === user.id) {
        const refreshedAccessToken = tokenUtils.getAccessToken({
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          isDeleted: user.isDeleted,
          emailVerified: user.emailVerified,
        });

        tokenUtils.setAccessTokenCookie(res, refreshedAccessToken);
      }

      req.user = {
        userId: user.id,
        role: userRole,
        email: user.email,
      };

      if (betterAuthSession?.session && betterAuthSession.user?.id === user.id) {
        const now = new Date();
        const expiresAt = new Date(betterAuthSession.session.expiresAt);
        const createdAt = new Date(betterAuthSession.session.createdAt);
        const sessionLifetime = expiresAt.getTime() - createdAt.getTime();
        const timeRemaining = expiresAt.getTime() - now.getTime();

        if (sessionLifetime > 0) {
          const percentRemaining = (timeRemaining / sessionLifetime) * 100;

          if (percentRemaining < 20) {
            res.setHeader("X-Session-Refresh", "true");
            res.setHeader("X-Session-Expires-At", expiresAt.toISOString());
            res.setHeader("X-Time-Remaining", timeRemaining.toString());
          }
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };

/**
 * Soft authentication. Populates `req.user` if a valid token exists, else
 * silently continues with `req.user` undefined. Use for endpoints like
 * `/auth/me` that should return `{ user: null }` for anonymous callers
 * instead of 401.
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

    const betterAuthSessionToken =
      CookieUtils.getCookie(req, "better-auth.session_token") ||
      CookieUtils.getCookie(req, "__Secure-better-auth.session_token");

    let userId: string | null = null;

    if (accessToken) {
      const verified = jwtUtils.verifyToken(accessToken, envVars.ACCESS_TOKEN_SECRET);
      if (verified.success && verified.data?.userId) {
        userId = String(verified.data.userId);
      }
    }

    if (!userId && (betterAuthSessionToken || authHeader)) {
      const fallbackCookieHeader = req.headers.cookie || [
        betterAuthSessionToken ? `better-auth.session_token=${betterAuthSessionToken}` : "",
        betterAuthSessionToken ? `__Secure-better-auth.session_token=${betterAuthSessionToken}` : "",
      ]
        .filter(Boolean)
        .join("; ");
      const session = await auth.api
        .getSession({
          headers: {
            ...(fallbackCookieHeader ? { cookie: fallbackCookieHeader } : {}),
            ...(authHeader ? { authorization: authHeader } : {}),
          },
        })
        .catch(() => null);
      if (session?.user?.id) userId = session.user.id;
    }

    if (!userId) return next();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) return next();
    if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED) {
      return next();
    }

    req.user = {
      userId: user.id,
      role: user.role as Role,
      email: user.email,
    };
    next();
  } catch {
    // Soft auth never blocks the request.
    next();
  }
};