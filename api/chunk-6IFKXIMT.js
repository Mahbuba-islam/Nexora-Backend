import {
  AIChatMessageRole,
  AddressType,
  AppError_default,
  CartStatus,
  CouponDiscountType,
  FulfillmentStatus,
  KycStatus,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutMethod,
  PayoutStatus,
  ProductCondition,
  ProductStatus,
  RefundStatus,
  ReviewStatus,
  Role,
  SellerOrderStatus,
  SellerStatus,
  UserStatus,
  envVars,
  notificationService,
  prisma,
  round2,
  slugify,
  stripeConnectService,
  toNumber
} from "./chunk-EM24WAHR.js";

// src/index.ts
import { Router as Router28 } from "express";

// src/modules/auth/auth.router.ts
import { Router } from "express";

// src/modules/auth/auth.controler.ts
import status3 from "http-status";

// src/modules/auth/auth.service.ts
import status2 from "http-status";

// src/utilis/cookie.ts
var setCookie = (res, key, value, options) => {
  res.cookie(key, value, options);
};
var getCookie = (req, key) => {
  return req.cookies[key];
};
var clearCookie = (res, key, options) => {
  res.clearCookie(key, options);
};
var CookieUtils = {
  setCookie,
  getCookie,
  clearCookie
};

// src/utilis/jwt.ts
import jwt from "jsonwebtoken";
var createToken = (payload, secret, { expiresIn }) => {
  const token = jwt.sign(payload, secret, { expiresIn });
  return token;
};
var verifyToken = (token, secret) => {
  try {
    const decoded = jwt.verify(token, secret);
    return {
      success: true,
      data: decoded
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error
    };
  }
};
var decodeToken = (token) => {
  const decoded = jwt.decode(token);
  return decoded;
};
var jwtUtils = {
  createToken,
  verifyToken,
  decodeToken
};

// src/utilis/token.ts
var isProduction = envVars.NODE_ENV === "production";
var getCookieBaseOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/"
});
var getAccessToken = (payload) => {
  const accessToken = jwtUtils.createToken(
    payload,
    envVars.ACCESS_TOKEN_SECRET,
    { expiresIn: envVars.ACCESS_TOKEN_EXPIRY }
  );
  return accessToken;
};
var getRefreshToken = (payload) => {
  const refreshToken = jwtUtils.createToken(
    payload,
    envVars.REFRESH_TOKEN_SECRET,
    { expiresIn: envVars.REFRESH_TOKEN_EXPIRY }
  );
  return refreshToken;
};
var setAccessTokenCookie = (res, token) => {
  CookieUtils.setCookie(res, "accessToken", token, {
    ...getCookieBaseOptions(),
    //1 day
    maxAge: 60 * 60 * 24 * 1e3
  });
};
var setRefreshTokenCookie = (res, token) => {
  CookieUtils.setCookie(res, "refreshToken", token, {
    ...getCookieBaseOptions(),
    //7d
    maxAge: 60 * 60 * 24 * 1e3 * 7
  });
};
var setBetterAuthSessionCookie = (res, token) => {
  const options = {
    ...getCookieBaseOptions(),
    //1 day
    maxAge: 60 * 60 * 24 * 1e3
  };
  CookieUtils.setCookie(res, "better-auth.session_token", token, options);
  CookieUtils.setCookie(res, "__Secure-better-auth.session_token", token, options);
};
var tokenUtils = {
  getAccessToken,
  getRefreshToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setBetterAuthSessionCookie
};

// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, emailOTP } from "better-auth/plugins";

// src/utilis/email.ts
import nodemailer from "nodemailer";
import status from "http-status";
var transporter = nodemailer.createTransport({
  host: envVars.EMAIL_SENDER.SMTP_HOST,
  secure: true,
  auth: {
    user: envVars.EMAIL_SENDER.SMTP_USER,
    pass: envVars.EMAIL_SENDER.SMTP_PASSWORD
  },
  port: parseInt(envVars.EMAIL_SENDER.SMTP_PORT)
});
var escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var renderOtpTemplate = (data) => {
  const name = escapeHtml(data.name ?? "User");
  const otp = escapeHtml(data.otp ?? "");
  return `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; background:#f6f8fb; padding:24px;">
    <div style="max-width:480px;margin:auto;background:#ffffff;border-radius:8px;padding:24px;">
      <h2 style="margin:0 0 16px;color:#111;">Hello ${name},</h2>
      <p style="color:#333;">Use the verification code below. It expires in 2 minutes.</p>
      <div style="font-size:28px;font-weight:bold;letter-spacing:6px;background:#f1f5f9;padding:16px;border-radius:6px;text-align:center;color:#0f172a;">${otp}</div>
      <p style="color:#666;font-size:13px;margin-top:16px;">If you didn't request this, you can ignore this email.</p>
    </div>
  </body>
</html>`;
};
var renderExpertApplicationDecisionTemplate = (data) => {
  const name = escapeHtml(data.name ?? "User");
  const statusText = String(data.status ?? "PENDING").toUpperCase();
  const isApproved = statusText === "APPROVED";
  const notes = data.notes ? escapeHtml(data.notes) : "";
  return `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; background:#f6f8fb; padding:24px;">
    <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:8px;padding:24px;">
      <h2 style="margin:0 0 16px;color:#111;">Hello ${name},</h2>
      <p style="color:#333;line-height:1.6;">
        Your expert application review is now complete.
      </p>
      <div style="margin:16px 0;padding:14px;border-radius:6px;background:${isApproved ? "#ecfdf3" : "#fef2f2"};color:${isApproved ? "#065f46" : "#991b1b"};font-weight:700;">
        Status: ${statusText}
      </div>
      ${notes ? `<p style="color:#374151;line-height:1.6;"><strong>Admin Notes:</strong> ${notes}</p>` : ""}
      <p style="color:#666;font-size:13px;margin-top:16px;">
        If you have questions, please contact support.
      </p>
    </div>
  </body>
</html>`;
};
var templateRegistry = {
  otp: renderOtpTemplate,
  expertApplicationDecision: renderExpertApplicationDecisionTemplate
};
var sendEmail = async ({
  subject,
  templateData,
  templateName,
  to,
  attachments
}) => {
  try {
    const renderer = templateRegistry[templateName];
    if (!renderer) {
      throw new AppError_default(
        status.INTERNAL_SERVER_ERROR,
        `Unknown email template: ${templateName}`
      );
    }
    const html = renderer(templateData);
    const info = await transporter.sendMail({
      from: envVars.EMAIL_SENDER.SMTP_FROM,
      to,
      subject,
      html,
      attachments: attachments?.map((attachment) => ({
        filename: attachment.fileName,
        content: attachment.context,
        contentType: attachment.contentType
      }))
    });
    console.log(`email sent ${to}: ${info.messageId} `);
  } catch (err) {
    console.log("email sending error", err.message);
    throw new AppError_default(status.INTERNAL_SERVER_ERROR, "failed to send");
  }
};

// src/lib/auth.ts
var ignoredBetterAuthMessages = /* @__PURE__ */ new Set([
  "User not found",
  "Invalid password",
  "Credential account not found",
  "Password not found"
]);
var shouldIgnoreBetterAuthLog = (level, message) => {
  return level === "error" && ignoredBetterAuthMessages.has(message);
};
var auth = betterAuth({
  baseURL: envVars.BETTER_AUTH_URL,
  secret: envVars.BETTER_AUTH_SECRET,
  logger: {
    level: "warn",
    log(level, message, ...args) {
      if (shouldIgnoreBetterAuthLog(level, message)) {
        return;
      }
      if (level === "error") {
        console.error(message, ...args);
        return;
      }
      if (level === "warn") {
        console.warn(message, ...args);
        return;
      }
      console.log(message, ...args);
    }
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql"
    // or "mysql", "postgresql", ...etc
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  },
  socialProviders: {
    google: {
      clientId: envVars.GOOGLE_CLIENT_ID,
      clientSecret: envVars.GOOGLE_CLIENT_SECRET,
      // callbackUrl: envVars.GOOGLE_CALLBACK_URL,
      mapProfileToUser: () => {
        return {
          role: Role.CUSTOMER,
          status: UserStatus.ACTIVE,
          needPasswordChange: false,
          emailVerified: true,
          isDeleted: false,
          deletedAt: null
        };
      }
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: Role.CUSTOMER
      },
      status: {
        type: "string",
        required: true,
        defaultValue: UserStatus.ACTIVE
      },
      needPasswordChange: {
        type: "boolean",
        required: true,
        defaultValue: false
      },
      isDeleted: {
        type: "boolean",
        required: true,
        defaultValue: false
      },
      deletedAt: {
        type: "date",
        required: false,
        defaultValue: null
      }
    }
  },
  plugins: [
    bearer(),
    emailOTP({
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "email-verification") {
          const user = await prisma.user.findUnique({
            where: {
              email
            }
          });
          if (!user) {
            console.error(`User with email ${email} not found. Cannot send verification OTP.`);
            return;
          }
          if (user && user.role === Role.ADMIN) {
            console.log(`User with email ${email} is a super admin. Skipping sending verification OTP.`);
            return;
          }
          if (user && !user.emailVerified) {
            sendEmail({
              to: email,
              subject: "Verify your email",
              templateName: "otp",
              templateData: {
                name: user.name,
                otp
              }
            });
          }
        } else if (type === "forget-password") {
          const user = await prisma.user.findUnique({
            where: {
              email
            }
          });
          if (user) {
            sendEmail({
              to: email,
              subject: "Password Reset OTP",
              templateName: "otp",
              templateData: {
                name: user.name,
                otp
              }
            });
          }
        }
      },
      expiresIn: 2 * 60,
      // 2 minutes in seconds
      otpLength: 6
    })
  ],
  session: {
    expiresIn: 60 * 60 * 60 * 24,
    // 1 day in seconds
    updateAge: 60 * 60 * 60 * 24,
    // 1 day in seconds
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 60 * 24
      // 1 day in seconds
    }
  },
  redirectURLs: {
    signIn: `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success`
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:5000", envVars.FRONTEND_URL],
  advanced: {
    // Backend routes call Better Auth APIs server-to-server (no browser Origin header).
    // Keep CORS as the browser boundary and bypass Better Auth's Origin-based CSRF check.
    disableCSRFCheck: true,
    // In production (Render → Vercel cross-domain) the browser will only
    // accept Set-Cookie if Secure + SameSite=None. In dev (localhost) the
    // browser refuses Secure cookies on http://, so flip both off.
    useSecureCookies: envVars.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
      secure: envVars.NODE_ENV === "production",
      httpOnly: true,
      path: "/"
    },
    cookies: {
      state: {
        attributes: {
          sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
          secure: envVars.NODE_ENV === "production",
          httpOnly: true,
          path: "/"
        }
      },
      sessionToken: {
        attributes: {
          sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
          secure: envVars.NODE_ENV === "production",
          httpOnly: true,
          path: "/"
        }
      }
    }
  }
});

// src/utilis/seed.ts
var DEMO_ACCOUNTS = {
  customer: {
    email: "demo.customer@nexora.dev",
    password: "Demo@1234",
    name: "Demo Customer"
  },
  seller: {
    email: "demo.seller@nexora.dev",
    password: "Demo@1234",
    name: "Demo Seller",
    shopName: "Demo Shop",
    shopSlug: "demo-shop"
  },
  admin: {
    email: "demo.admin@nexora.dev",
    password: "Demo@1234",
    name: "Demo Admin"
  }
};
var seedAdmin = async () => {
  try {
    const isAdminExists = await prisma.user.findFirst({
      where: { role: Role.ADMIN }
    });
    if (isAdminExists) {
      console.log("Admin seed skipped: admin already exists");
      return;
    }
    const adminUser = await auth.api.signUpEmail({
      body: {
        email: envVars.ADMIN_EMAIL,
        password: envVars.ADMIN_PASSWORD,
        name: "Nexora Admin",
        role: Role.ADMIN,
        rememberMe: false
      }
    });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: adminUser.user.id },
        data: {
          emailVerified: true,
          role: Role.ADMIN,
          status: UserStatus.ACTIVE
        }
      });
      await tx.admin.create({
        data: {
          userId: adminUser.user.id,
          name: "Nexora Admin",
          email: envVars.ADMIN_EMAIL
        }
      });
    });
    console.log("\u2705 Nexora admin created:", envVars.ADMIN_EMAIL);
  } catch (error) {
    console.error("Error seeding admin:", error?.message || error);
    await prisma.user.delete({ where: { email: envVars.ADMIN_EMAIL } }).catch(() => null);
  }
};
var ensureBetterAuthUser = async (params) => {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) return existing;
  const created = await auth.api.signUpEmail({
    body: {
      email: params.email,
      password: params.password,
      name: params.name,
      rememberMe: false
    }
  });
  return prisma.user.findUnique({ where: { id: created.user.id } });
};
var seedDemoCustomer = async () => {
  const cfg = DEMO_ACCOUNTS.customer;
  try {
    const user = await ensureBetterAuthUser(cfg);
    if (!user) return;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
        isDeleted: false
      }
    });
    await prisma.customer.upsert({
      where: { userId: user.id },
      update: { fullName: cfg.name, email: cfg.email, isDeleted: false },
      create: { userId: user.id, fullName: cfg.name, email: cfg.email }
    });
    await prisma.wishlist.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id }
    }).catch(() => null);
    console.log("\u2705 Demo customer ready:", cfg.email);
  } catch (error) {
    console.error("Error seeding demo customer:", error?.message || error);
  }
};
var seedDemoAdmin = async () => {
  const cfg = DEMO_ACCOUNTS.admin;
  try {
    const user = await ensureBetterAuthUser(cfg);
    if (!user) return;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        isDeleted: false
      }
    });
    await prisma.admin.upsert({
      where: { userId: user.id },
      update: { name: cfg.name, email: cfg.email, isDeleted: false },
      create: { userId: user.id, name: cfg.name, email: cfg.email }
    });
    console.log("\u2705 Demo admin ready:", cfg.email);
  } catch (error) {
    console.error("Error seeding demo admin:", error?.message || error);
  }
};
var seedDemoSeller = async () => {
  const cfg = DEMO_ACCOUNTS.seller;
  try {
    const user = await ensureBetterAuthUser(cfg);
    if (!user) return;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        role: Role.SELLER,
        status: UserStatus.ACTIVE,
        isDeleted: false
      }
    });
    const existingSeller = await prisma.seller.findUnique({ where: { userId: user.id } });
    if (existingSeller) {
      await prisma.seller.update({
        where: { id: existingSeller.id },
        data: {
          status: SellerStatus.APPROVED,
          kycStatus: KycStatus.APPROVED,
          isDeleted: false,
          suspensionReason: null,
          rejectionReason: null,
          approvedAt: existingSeller.approvedAt ?? /* @__PURE__ */ new Date()
        }
      });
    } else {
      await prisma.seller.create({
        data: {
          userId: user.id,
          shopName: cfg.shopName,
          shopSlug: cfg.shopSlug,
          tagline: "Demo storefront for previewing the seller dashboard",
          description: "This is a demo seller account used for showcasing the marketplace dashboard.",
          contactEmail: cfg.email,
          legalName: "Nexora Demo LLC",
          country: "US",
          status: SellerStatus.APPROVED,
          kycStatus: KycStatus.APPROVED,
          payoutMethod: PayoutMethod.MANUAL_BANK,
          approvedAt: /* @__PURE__ */ new Date(),
          commissionRate: 10
        }
      });
    }
    console.log("\u2705 Demo seller ready:", cfg.email);
  } catch (error) {
    console.error("Error seeding demo seller:", error?.message || error);
  }
};
var seedDemoAccounts = async () => {
  await seedDemoCustomer();
  await seedDemoSeller();
  await seedDemoAdmin();
};

// src/modules/auth/auth.service.ts
var isBetterAuthLikeError = (error) => {
  if (!error || typeof error !== "object") return false;
  const c = error;
  return typeof c.statusCode === "number" || typeof c.status === "string" || typeof c.body?.message === "string";
};
var mapBetterAuthError = (error, fallbackMessage) => {
  if (!isBetterAuthLikeError(error)) return null;
  const message = error.body?.message || error.message || fallbackMessage;
  const statusCode = typeof error.statusCode === "number" ? error.statusCode : error.status === "UNAUTHORIZED" ? status2.UNAUTHORIZED : status2.BAD_REQUEST;
  return new AppError_default(statusCode, message);
};
var registerCustomer = async (payload) => {
  const { fullName, email, password } = payload;
  const data = await auth.api.signUpEmail({
    body: { name: fullName, email, password }
  });
  if (!data.user) {
    throw new AppError_default(status2.BAD_REQUEST, "Failed to register user");
  }
  await prisma.user.update({
    where: { id: data.user.id },
    data: { role: Role.CUSTOMER }
  });
  const customer = await prisma.$transaction(async (tx) => {
    try {
      const profile = await tx.customer.create({
        data: { userId: data.user.id, fullName, email }
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
    emailVerified: data.user.emailVerified
  };
  return {
    ...data,
    accessToken: tokenUtils.getAccessToken(tokenPayload),
    refreshToken: tokenUtils.getRefreshToken(tokenPayload),
    customer
  };
};
var loginUser = async (payload) => {
  const { email, password } = payload;
  const data = await auth.api.signInEmail({ body: { email, password } }).catch((error) => {
    const mapped = mapBetterAuthError(error, "Invalid email or password");
    if (mapped) throw mapped;
    throw error;
  });
  if (data.user.status === UserStatus.BLOCKED) {
    throw new AppError_default(status2.FORBIDDEN, "User is blocked");
  }
  if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
    throw new AppError_default(status2.FORBIDDEN, "User is deleted");
  }
  const tokenPayload = {
    userId: data.user.id,
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified
  };
  return {
    ...data,
    accessToken: tokenUtils.getAccessToken(tokenPayload),
    refreshToken: tokenUtils.getRefreshToken(tokenPayload)
  };
};
var getMe = async (user) => {
  const isUserExists = await prisma.user.findUnique({
    where: { id: user.userId },
    include: {
      customer: true,
      admin: true,
      addresses: { where: { isDeleted: false }, orderBy: { isDefault: "desc" } }
    }
  });
  if (!isUserExists) {
    throw new AppError_default(status2.NOT_FOUND, "User not found");
  }
  return isUserExists;
};
var getNewToken = async (refreshToken, sessionToken) => {
  const verified = jwtUtils.verifyToken(refreshToken, envVars.REFRESH_TOKEN_SECRET);
  if (!verified.success) {
    throw new AppError_default(status2.UNAUTHORIZED, "Invalid refresh token");
  }
  const data = verified.data;
  if (!data?.userId) {
    throw new AppError_default(status2.UNAUTHORIZED, "Invalid refresh token payload");
  }
  const userRecord = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!userRecord || userRecord.isDeleted || userRecord.status === UserStatus.DELETED || userRecord.status === UserStatus.BLOCKED) {
    throw new AppError_default(status2.UNAUTHORIZED, "User is not authorized");
  }
  let nextSessionToken = null;
  if (sessionToken) {
    try {
      const baSession = await auth.api.getSession({
        headers: { Cookie: `better-auth.session_token=${sessionToken}` }
      });
      if (baSession?.session && baSession.user?.id === userRecord.id) {
        await prisma.session.update({
          where: { token: baSession.session.token },
          data: {
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3),
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).catch(() => null);
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
    emailVerified: userRecord.emailVerified
  };
  return {
    accessToken: tokenUtils.getAccessToken(payload),
    refreshToken: tokenUtils.getRefreshToken(payload),
    sessionToken: nextSessionToken
  };
};
var changePassword = async (payload, authContext) => {
  const { sessionToken, authorizationHeader, cookieHeader, userId } = authContext;
  const buildHeaders = (token) => {
    const headerInit = {};
    if (authorizationHeader) headerInit.Authorization = authorizationHeader;
    else if (token) headerInit.Authorization = `Bearer ${token}`;
    if (cookieHeader) headerInit.Cookie = cookieHeader;
    else if (token)
      headerInit.Cookie = `better-auth.session_token=${token}; __Secure-better-auth.session_token=${token}`;
    return new Headers(headerInit);
  };
  if (!sessionToken && !authorizationHeader && !cookieHeader && !userId) {
    throw new AppError_default(status2.UNAUTHORIZED, "Session expired. Please login again.");
  }
  let authHeaders = buildHeaders(sessionToken);
  let session = await auth.api.getSession({ headers: authHeaders }).catch(() => null);
  if (!session?.user && userId) {
    const activeSession = await prisma.session.findFirst({
      where: { userId, expiresAt: { gt: /* @__PURE__ */ new Date() } },
      orderBy: { updatedAt: "desc" }
    });
    if (activeSession?.token) {
      authHeaders = buildHeaders(activeSession.token);
      session = await auth.api.getSession({ headers: authHeaders }).catch(() => null);
    }
  }
  if (!session?.user) {
    throw new AppError_default(status2.UNAUTHORIZED, "Invalid session token. Please login again.");
  }
  const { currentPassword, newPassword } = payload;
  if (currentPassword && currentPassword === newPassword) {
    throw new AppError_default(status2.BAD_REQUEST, "New password must differ from current");
  }
  const credentialAccount = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "credential" }
  });
  let result;
  if (credentialAccount?.password) {
    if (!currentPassword) {
      throw new AppError_default(status2.BAD_REQUEST, "Current password is required");
    }
    result = await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: authHeaders
    });
  } else {
    result = await auth.api.setPassword({
      body: { newPassword },
      headers: authHeaders
    });
  }
  if (session.user.needPasswordChange) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { needPasswordChange: false }
    });
  }
  const updatedUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!updatedUser) throw new AppError_default(status2.NOT_FOUND, "User not found");
  const tokenPayload = {
    userId: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
    status: updatedUser.status,
    isDeleted: updatedUser.isDeleted,
    emailVerified: updatedUser.emailVerified
  };
  const betterAuthToken = "token" in result ? result.token : null;
  return {
    status: true,
    token: betterAuthToken,
    user: updatedUser,
    accessToken: tokenUtils.getAccessToken(tokenPayload),
    refreshToken: tokenUtils.getRefreshToken(tokenPayload)
  };
};
var logOutUser = async (sessionToken) => {
  return auth.api.signOut({
    headers: new Headers({ Authorization: `Bearer ${sessionToken}` })
  });
};
var verifyEmail = async (email, otp) => {
  const result = await auth.api.verifyEmailOTP({ body: { email, otp } });
  if (result.status && !result.user.emailVerified) {
    await prisma.user.update({ where: { email }, data: { emailVerified: true } });
  }
};
var forgetPassword = async (email) => {
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) throw new AppError_default(status2.NOT_FOUND, "User not found");
  if (!u.emailVerified) throw new AppError_default(status2.BAD_REQUEST, "Email not verified");
  if (u.isDeleted || u.status === UserStatus.DELETED)
    throw new AppError_default(status2.NOT_FOUND, "User not found");
  await auth.api.requestPasswordResetEmailOTP({ body: { email } });
};
var resetPassword = async (email, otp, newPassword) => {
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) throw new AppError_default(status2.NOT_FOUND, "User not found");
  if (!u.emailVerified) throw new AppError_default(status2.BAD_REQUEST, "Email not verified");
  if (u.isDeleted || u.status === UserStatus.DELETED)
    throw new AppError_default(status2.NOT_FOUND, "User not found");
  const result = await auth.api.resetPasswordEmailOTP({
    body: { email, otp, password: newPassword }
  });
  if (!result?.success) {
    throw new AppError_default(status2.BAD_REQUEST, "Password reset failed");
  }
  if (u.needPasswordChange) {
    await prisma.user.update({
      where: { id: u.id },
      data: { needPasswordChange: false }
    });
  }
  await prisma.session.deleteMany({ where: { userId: u.id } });
};
var googleLoginSuccess = async (session) => {
  const exists = await prisma.customer.findUnique({
    where: { userId: session.user.id }
  });
  if (!exists) {
    await prisma.customer.create({
      data: {
        userId: session.user.id,
        fullName: session.user.name,
        email: session.user.email
      }
    });
    await prisma.wishlist.create({ data: { userId: session.user.id } }).catch(() => null);
  }
  const accessToken = tokenUtils.getAccessToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name
  });
  const refreshToken = tokenUtils.getRefreshToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name
  });
  return { accessToken, refreshToken };
};
var checkEmailExists = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  return !!user;
};
var updateProfile = async (user, payload) => {
  const updatedUser = await prisma.user.update({
    where: { id: user.userId },
    data: {
      ...payload.name !== void 0 ? { name: payload.name } : {},
      ...payload.email !== void 0 ? { email: payload.email } : {},
      ...payload.image !== void 0 ? { image: payload.image } : {}
    }
  });
  if (updatedUser.role === Role.CUSTOMER) {
    await prisma.customer.update({
      where: { userId: user.userId },
      data: {
        ...payload.fullName !== void 0 ? { fullName: payload.fullName } : {},
        ...payload.phone !== void 0 ? { phone: payload.phone } : {},
        ...payload.email !== void 0 ? { email: payload.email } : {}
      }
    });
  }
  return updatedUser;
};
var loginDemo = async (role) => {
  const cfg = DEMO_ACCOUNTS[role];
  if (!cfg) {
    throw new AppError_default(status2.BAD_REQUEST, "Invalid demo role");
  }
  const existing = await prisma.user.findUnique({ where: { email: cfg.email } });
  if (!existing) {
    await seedDemoAccounts();
  }
  return loginUser({ email: cfg.email, password: cfg.password });
};
var authService = {
  registerCustomer,
  loginUser,
  loginDemo,
  getMe,
  getNewToken,
  changePassword,
  logOutUser,
  verifyEmail,
  forgetPassword,
  resetPassword,
  googleLoginSuccess,
  checkEmailExists,
  updateProfile
};

// src/shared/catchAsync.ts
var catchAsync = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};

// src/shared/sendResponsr.ts
var sendResponse = (res, responseData) => {
  const { httpStatusCode, success, message, data, meta } = responseData;
  res.status(httpStatusCode).json({
    success,
    message,
    data,
    ...meta ? { meta } : {}
  });
};

// src/modules/auth/auth.controler.ts
var getBetterAuthSessionToken = (req) => req.cookies["better-auth.session_token"] ?? req.cookies["__Secure-better-auth.session_token"];
var registeredUser = catchAsync(async (req, res) => {
  const result = await authService.registerCustomer(req.body);
  sendResponse(res, {
    httpStatusCode: status3.CREATED,
    success: true,
    message: "Account created successfully. Please verify your email.",
    data: result
  });
});
var loginUser2 = catchAsync(async (req, res) => {
  const result = await authService.loginUser(req.body);
  const { accessToken, refreshToken, token, user, ...rest } = result;
  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token);
  sendResponse(res, {
    httpStatusCode: status3.OK,
    success: true,
    message: "Login successful",
    data: { accessToken, refreshToken, token, user, ...rest }
  });
});
var getMe2 = catchAsync(async (req, res) => {
  const result = await authService.getMe(req.user);
  sendResponse(res, {
    httpStatusCode: status3.OK,
    success: true,
    message: "User profile fetched",
    data: result
  });
});
var getNewToken2 = catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const baToken = getBetterAuthSessionToken(req);
  if (!refreshToken) throw new AppError_default(status3.UNAUTHORIZED, "Refresh token missing");
  const r = await authService.getNewToken(refreshToken, baToken);
  tokenUtils.setAccessTokenCookie(res, r.accessToken);
  tokenUtils.setRefreshTokenCookie(res, r.refreshToken);
  if (r.sessionToken) tokenUtils.setBetterAuthSessionCookie(res, r.sessionToken);
  sendResponse(res, {
    httpStatusCode: status3.OK,
    success: true,
    message: "Tokens refreshed",
    data: r
  });
});
var changePassword2 = catchAsync(async (req, res) => {
  const result = await authService.changePassword(req.body, {
    sessionToken: getBetterAuthSessionToken(req),
    authorizationHeader: req.headers.authorization,
    cookieHeader: req.headers.cookie,
    userId: req.user?.userId
  });
  tokenUtils.setAccessTokenCookie(res, result.accessToken);
  tokenUtils.setRefreshTokenCookie(res, result.refreshToken);
  if (result.token) tokenUtils.setBetterAuthSessionCookie(res, result.token);
  sendResponse(res, {
    httpStatusCode: status3.OK,
    success: true,
    message: "Password changed successfully",
    data: result
  });
});
var logOutUser2 = catchAsync(async (req, res) => {
  const baToken = getBetterAuthSessionToken(req);
  const result = await authService.logOutUser(baToken);
  const cookieNames = [
    "accessToken",
    "refreshToken",
    "better-auth.session_token",
    "__Secure-better-auth.session_token"
  ];
  const variants = [
    { httpOnly: true, secure: true, sameSite: "none", path: "/" },
    { httpOnly: true, secure: false, sameSite: "lax", path: "/" },
    { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
    { path: "/" },
    {}
  ];
  for (const name of cookieNames)
    for (const opts of variants) CookieUtils.clearCookie(res, name, opts);
  sendResponse(res, {
    httpStatusCode: status3.OK,
    success: true,
    message: "Logged out",
    data: result
  });
});
var verifyEmail2 = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  await authService.verifyEmail(email, otp);
  sendResponse(res, {
    httpStatusCode: status3.OK,
    success: true,
    message: "Email verified successfully"
  });
});
var forgetPassword2 = catchAsync(async (req, res) => {
  await authService.forgetPassword(req.body.email);
  sendResponse(res, {
    httpStatusCode: status3.OK,
    success: true,
    message: "Password reset OTP sent"
  });
});
var resetPassword2 = catchAsync(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  await authService.resetPassword(email, otp, newPassword);
  sendResponse(res, {
    httpStatusCode: status3.OK,
    success: true,
    message: "Password reset successful"
  });
});
var googleLogin = catchAsync(async (_req, res) => {
  res.redirect(`${envVars.BETTER_AUTH_URL}/api/auth/sign-in/social?provider=google`);
});
var googleLoginSuccess2 = catchAsync(async (req, res) => {
  const session = req.session;
  const { accessToken, refreshToken } = await authService.googleLoginSuccess(session);
  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  res.redirect(envVars.FRONTEND_URL);
});
var handlerOAuthError = catchAsync(async (_req, res) => {
  res.redirect(`${envVars.FRONTEND_URL}/login?error=oauth`);
});
var checkEmailAvailability = catchAsync(async (req, res) => {
  const email = String(req.query.email || "");
  const exists = await authService.checkEmailExists(email);
  sendResponse(res, {
    httpStatusCode: status3.OK,
    success: true,
    message: "Email availability checked",
    data: { exists, available: !exists }
  });
});
var updateProfile2 = catchAsync(async (req, res) => {
  const result = await authService.updateProfile(req.user, req.body);
  sendResponse(res, {
    httpStatusCode: status3.OK,
    success: true,
    message: "Profile updated",
    data: result
  });
});
var demoLogin = catchAsync(async (req, res) => {
  const raw = (req.body?.role ?? req.params?.role ?? req.query?.role ?? "").toString().toLowerCase();
  const role = raw;
  if (!["customer", "seller", "admin"].includes(role)) {
    throw new AppError_default(status3.BAD_REQUEST, "role must be one of: customer, seller, admin");
  }
  const result = await authService.loginDemo(role);
  const { accessToken, refreshToken, token, user, ...rest } = result;
  tokenUtils.setAccessTokenCookie(res, accessToken);
  tokenUtils.setRefreshTokenCookie(res, refreshToken);
  tokenUtils.setBetterAuthSessionCookie(res, token);
  sendResponse(res, {
    httpStatusCode: status3.OK,
    success: true,
    message: `Demo ${role} login successful`,
    data: { accessToken, refreshToken, token, user, role, ...rest }
  });
});
var authControler = {
  registeredUser,
  loginUser: loginUser2,
  getMe: getMe2,
  getNewToken: getNewToken2,
  changePassword: changePassword2,
  logOutUser: logOutUser2,
  verifyEmail: verifyEmail2,
  forgetPassword: forgetPassword2,
  resetPassword: resetPassword2,
  googleLogin,
  googleLoginSuccess: googleLoginSuccess2,
  handlerOAuthError,
  checkEmailAvailability,
  updateProfile: updateProfile2,
  demoLogin
};

// src/middleware/cheackAuth.ts
import status4 from "http-status";
var checkAuth = (...authRoles) => async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : void 0;
    const cookieToken = CookieUtils.getCookie(req, "accessToken");
    const accessToken = bearerToken || cookieToken;
    const betterAuthSessionToken = CookieUtils.getCookie(req, "better-auth.session_token") || CookieUtils.getCookie(req, "__Secure-better-auth.session_token");
    let userId = null;
    let betterAuthSession = null;
    if (accessToken) {
      const verified = jwtUtils.verifyToken(accessToken, envVars.ACCESS_TOKEN_SECRET);
      if (verified.success && verified.data?.userId) {
        userId = String(verified.data.userId);
      }
    }
    if (!userId && (betterAuthSessionToken || authHeader)) {
      const fallbackCookieHeader = req.headers.cookie || [
        betterAuthSessionToken ? `better-auth.session_token=${betterAuthSessionToken}` : "",
        betterAuthSessionToken ? `__Secure-better-auth.session_token=${betterAuthSessionToken}` : ""
      ].filter(Boolean).join("; ");
      betterAuthSession = await auth.api.getSession({
        headers: {
          ...fallbackCookieHeader ? { cookie: fallbackCookieHeader } : {},
          ...authHeader ? { authorization: authHeader } : {}
        }
      }).catch(() => null);
      if (betterAuthSession?.user?.id) {
        userId = betterAuthSession.user.id;
      }
    }
    if (!userId) {
      throw new AppError_default(
        status4.UNAUTHORIZED,
        `Unauthorized! No access token. Route: ${req.method} ${req.originalUrl}. Send cookie or Bearer token.`
      );
    }
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new AppError_default(status4.UNAUTHORIZED, "Unauthorized! User not found.");
    }
    const userRole = user.role;
    if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED || user.isDeleted) {
      throw new AppError_default(status4.UNAUTHORIZED, "Unauthorized! User inactive.");
    }
    if (authRoles.length > 0 && !authRoles.includes(userRole)) {
      throw new AppError_default(
        status4.FORBIDDEN,
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
        emailVerified: user.emailVerified
      });
      tokenUtils.setAccessTokenCookie(res, refreshedAccessToken);
    }
    req.user = {
      userId: user.id,
      role: userRole,
      email: user.email
    };
    if (betterAuthSession?.session && betterAuthSession.user?.id === user.id) {
      const now = /* @__PURE__ */ new Date();
      const expiresAt = new Date(betterAuthSession.session.expiresAt);
      const createdAt = new Date(betterAuthSession.session.createdAt);
      const sessionLifetime = expiresAt.getTime() - createdAt.getTime();
      const timeRemaining = expiresAt.getTime() - now.getTime();
      if (sessionLifetime > 0) {
        const percentRemaining = timeRemaining / sessionLifetime * 100;
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

// src/middleware/validateRequest.ts
var replaceObjectContents = (target, source) => {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });
  if (source && typeof source === "object") {
    Object.assign(target, source);
  }
};
var validateRequest = (zodSchema) => {
  return (req, res, next) => {
    try {
      if (typeof req.body?.data === "string") {
        req.body = JSON.parse(req.body.data);
      }
      const normalizedBody = req.body ?? {};
      const requestData = {
        body: normalizedBody,
        query: req.query,
        params: req.params
      };
      const wrappedResult = zodSchema.safeParse(requestData);
      if (wrappedResult.success) {
        const parsedData = wrappedResult.data;
        if (parsedData.body !== void 0) {
          req.body = parsedData.body;
        }
        if (parsedData.query !== void 0) {
          replaceObjectContents(
            req.query,
            parsedData.query
          );
        }
        if (parsedData.params !== void 0) {
          replaceObjectContents(
            req.params,
            parsedData.params
          );
        }
        return next();
      }
      const bodyOnlyResult = zodSchema.safeParse(normalizedBody);
      if (!bodyOnlyResult.success) {
        return next(bodyOnlyResult.error);
      }
      req.body = bodyOnlyResult.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// src/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";
var apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  limit: 600,
  // ~40 req/min per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down and try again shortly."
  }
});
var authLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  limit: 20,
  // 20 sensitive ops per IP per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: "Too many authentication attempts from this IP. Please wait 15 minutes and try again."
  }
});
var checkoutLimiter = rateLimit({
  windowMs: 60 * 1e3,
  // 1 minute
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many checkout attempts. Please wait a moment and retry."
  }
});

// src/modules/auth/auth.validation.ts
import { z } from "zod";
var registerZodSchema = z.object({
  fullName: z.string().min(3, "Full name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
var loginZodSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters long").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number").regex(/[@$!%*?&]/, "Password must contain at least one special character")
});
var forgotPasswordZodSchema = z.object({
  email: z.string().email("Invalid email")
});
var changePasswordZodSchema = z.object({
  currentPassword: z.string().trim().optional().transform((value) => value || void 0),
  newPassword: z.string().min(8, "Password must be at least 8 characters long").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number").regex(/[@$!%*?&]/, "Password must contain at least one special character")
});
var updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  image: z.string().url().nullable().optional(),
  phone: z.string().min(5).max(30).optional(),
  fullName: z.string().min(2).optional()
});

// src/modules/auth/auth.router.ts
var router = Router();
router.post(
  "/register",
  authLimiter,
  validateRequest(registerZodSchema),
  authControler.registeredUser
);
router.post("/login", authLimiter, validateRequest(loginZodSchema), authControler.loginUser);
router.post("/demo-login", authLimiter, authControler.demoLogin);
router.post("/demo-login/:role", authLimiter, authControler.demoLogin);
router.get("/me", checkAuth(), authControler.getMe);
router.post("/refresh-token", authControler.getNewToken);
router.post(
  "/change-password",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  validateRequest(changePasswordZodSchema),
  authControler.changePassword
);
router.post(
  "/logOut",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  authControler.logOutUser
);
router.post("/verify-email", authLimiter, authControler.verifyEmail);
router.post(
  "/forget-password",
  authLimiter,
  validateRequest(forgotPasswordZodSchema),
  authControler.forgetPassword
);
router.post("/reset-password", authLimiter, authControler.resetPassword);
router.get("/login/google", authControler.googleLogin);
router.get("/google/success", authControler.googleLoginSuccess);
router.get("/oauth/error", authControler.handlerOAuthError);
router.get("/check-email", authControler.checkEmailAvailability);
router.put(
  "/update-profile",
  checkAuth(),
  validateRequest(updateProfileSchema),
  authControler.updateProfile
);
var authRoutes = router;

// src/modules/user/user.router.ts
import { Router as Router2 } from "express";

// src/modules/user/user.controler.ts
import status6 from "http-status";

// src/modules/user/user.service.ts
import status5 from "http-status";

// src/utilis/queryBuilder.ts
var QueryBuilder = class {
  constructor(model, queryParams, config) {
    this.model = model;
    this.queryParams = queryParams;
    this.config = config;
    this.page = 1;
    this.limit = 10;
    this.skip = 0;
    this.sortBy = "createdAt";
    this.sortOrder = "desc";
    this.selectFields = {};
    this.query = {
      where: {},
      include: {},
      orderBy: {},
      skip: 0,
      take: 10
    };
    this.countQuery = {
      where: {}
    };
  }
  // SEARCH
  search() {
    const { searchTerm } = this.queryParams;
    const { searchableFields } = this.config;
    if (searchTerm && searchableFields && searchableFields.length > 0) {
      const searchConditions = searchableFields.map(
        (field) => {
          if (field.includes(".")) {
            const parts = field.split(".");
            if (parts.length === 2) {
              const [relation, nestedField] = parts;
              const stringFilter2 = {
                contains: searchTerm,
                mode: "insensitive"
              };
              return {
                [relation]: {
                  [nestedField]: stringFilter2
                }
              };
            } else if (parts.length === 3) {
              const [relation, nestedRelation, nestedField] = parts;
              const stringFilter2 = {
                contains: searchTerm,
                mode: "insensitive"
              };
              return {
                [relation]: {
                  some: {
                    [nestedRelation]: {
                      [nestedField]: stringFilter2
                    }
                  }
                }
              };
            }
          }
          const stringFilter = {
            contains: searchTerm,
            mode: "insensitive"
          };
          return {
            [field]: stringFilter
          };
        }
      );
      const whereConditions = this.query.where;
      whereConditions.OR = searchConditions;
      const countWhereConditions = this.countQuery.where;
      countWhereConditions.OR = searchConditions;
    }
    return this;
  }
  // FILTER
  filter() {
    const { filterableFields } = this.config;
    const excludedField = ["searchTerm", "page", "limit", "sortBy", "sortOrder", "fields", "include"];
    const filterParams = {};
    Object.keys(this.queryParams).forEach((key) => {
      if (!excludedField.includes(key)) {
        filterParams[key] = this.queryParams[key];
      }
    });
    const queryWhere = this.query.where;
    const countQueryWhere = this.countQuery.where;
    Object.keys(filterParams).forEach((key) => {
      const value = filterParams[key];
      if (value === void 0 || value === "") {
        return;
      }
      const isAllowedField = !filterableFields || filterableFields.length === 0 || filterableFields.includes(key);
      if (key.includes(".")) {
        const parts = key.split(".");
        if (filterableFields && !filterableFields.includes(key)) {
          return;
        }
        if (parts.length === 2) {
          const [relation, nestedField] = parts;
          if (!queryWhere[relation]) {
            queryWhere[relation] = {};
            countQueryWhere[relation] = {};
          }
          const queryRelation = queryWhere[relation];
          const countRelation = countQueryWhere[relation];
          queryRelation[nestedField] = this.parseFilterValue(value);
          countRelation[nestedField] = this.parseFilterValue(value);
          return;
        } else if (parts.length === 3) {
          const [relation, nestedRelation, nestedField] = parts;
          if (!queryWhere[relation]) {
            queryWhere[relation] = {
              some: {}
            };
            countQueryWhere[relation] = {
              some: {}
            };
          }
          const queryRelation = queryWhere[relation];
          const countRelation = countQueryWhere[relation];
          if (!queryRelation.some) {
            queryRelation.some = {};
          }
          if (!countRelation.some) {
            countRelation.some = {};
          }
          const querySome = queryRelation.some;
          const countSome = countRelation.some;
          if (!querySome[nestedRelation]) {
            querySome[nestedRelation] = {};
          }
          if (!countSome[nestedRelation]) {
            countSome[nestedRelation] = {};
          }
          const queryNestedRelation = querySome[nestedRelation];
          const countNestedRelation = countSome[nestedRelation];
          queryNestedRelation[nestedField] = this.parseFilterValue(value);
          countNestedRelation[nestedField] = this.parseFilterValue(value);
          return;
        }
      }
      if (!isAllowedField) {
        return;
      }
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        queryWhere[key] = this.parseRangeFilter(value);
        countQueryWhere[key] = this.parseRangeFilter(value);
        return;
      }
      queryWhere[key] = this.parseFilterValue(value);
      countQueryWhere[key] = this.parseFilterValue(value);
    });
    return this;
  }
  //paginate
  paginate() {
    const page = Number(this.queryParams.page) || 1;
    const limit = Number(this.queryParams.limit) || 10;
    this.page = page;
    this.limit = limit;
    this.skip = (page - 1) * limit;
    this.query.skip = this.skip;
    this.query.take = this.limit;
    return this;
  }
  //sort 
  sort() {
    const sortBy = this.queryParams.sortBy || "createdAt";
    const sortOrder = this.queryParams.sortOrder === "asc" ? "asc" : "desc";
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    if (sortBy.includes(".")) {
      const parts = sortBy.split(".");
      if (parts.length === 2) {
        const [realation, nestedField] = parts;
        this.query.orderBy = {
          [realation]: {
            [nestedField]: sortOrder
          }
        };
      } else if (parts.length === 3) {
        const [realation, nestedRealition, nestedField] = parts;
        this.query.orderBy = {
          [realation]: {
            [nestedField]: {
              [nestedRealition]: sortOrder
            }
          }
        };
      } else {
        this.query.orderBy = {
          [sortBy]: sortOrder
        };
      }
    }
    return this;
  }
  //  //fields
  //  fields():this{
  //   const fieldsParams = this.queryParams.fields
  // if(fieldsParams && typeof fieldsParams === 'string'){
  //     const fieldsArray = fieldsParams?.split(',').map(field => field.trim())
  //   this.selectFields = {}
  //   fieldsArray?.forEach(field => {
  //     if(this.selectFields){
  //       this.selectFields[field] = true
  //     }
  //   })
  //   this.query.select = this.selectFields as Record<string, boolean | Record<string, unknown>>
  //   delete this.query.include
  // }
  //   return this
  //  }
  //include
  include(relation) {
    if (Object.keys(this.selectFields).length > 0) return this;
    this.query.include = { ...this.query.include, ...relation };
    return this;
  }
  //dynamicInclude
  dynamicInclude(includeConfig, defaultInclude) {
    if (this.selectFields) {
      return this;
    }
    const result = {};
    defaultInclude?.forEach((field) => {
      if (includeConfig[field]) {
        result[field] = includeConfig[field];
      }
    });
    const includeParam = this.queryParams.includes;
    if (includeParam && typeof includeParam === "string") {
      const requestRelations = includeParam.split(",").map((relation) => relation.trim());
      requestRelations.forEach((relation) => {
        if (includeConfig[relation]) {
          result[relation] = includeConfig[relation];
        }
      });
    }
    this.query.include = { ...this.query.include, ...result };
    return this;
  }
  fields() {
    const fieldsParams = this.queryParams.fields;
    if (fieldsParams && typeof fieldsParams === "string") {
      const fieldsArray = fieldsParams.split(",").map((field) => field.trim());
      this.selectFields = {};
      fieldsArray.forEach((field) => {
        this.selectFields[field] = true;
      });
      this.query.select = this.selectFields;
    }
    return this;
  }
  //where
  where(condition) {
    this.query.where = this.deepMerge(this.query.where, condition);
    this.countQuery.where = this.deepMerge(this.countQuery.where, condition);
    return this;
  }
  //excute
  async excute() {
    const [total, data] = await Promise.all([
      this.model.count(this.countQuery),
      this.model.findMany(this.query)
    ]);
    const totalPages = Math.ceil(total / this.limit);
    return {
      data,
      meta: {
        page: this.page,
        limit: this.limit,
        total,
        totalPages
      }
    };
  }
  //count
  async count() {
    return await this.model.count(this.countQuery);
  }
  //debugging purpose method
  getQuery() {
    return this.query;
  }
  //deep merge
  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        if (result[key] && typeof result[key] === "object" && !Array.isArray(result[key])) {
          result[key] = this.deepMerge(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    return result;
  }
  parseFilterValue(value) {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    if (typeof value === "string" && !isNaN(Number(value)) && value != "") {
      return Number(value);
    }
    if (Array.isArray(value)) {
      return { in: value.map((item) => this.parseFilterValue(item)) };
    }
    return value;
  }
  parseRangeFilter(value) {
    const rangeQuery = {};
    Object.keys(value).forEach((operator) => {
      const operatorValue = value[operator];
      const parsedValue = typeof operatorValue === "string" && !isNaN(Number(operatorValue)) ? Number(operatorValue) : operatorValue;
      switch (operator) {
        case "lt":
        case "lte":
        case "gt":
        case "gte":
        case "equals":
        case "not":
        case "contains":
        case "startsWith":
        case "endsWith":
          rangeQuery[operator] = parsedValue;
          break;
        case "in":
        case "notIn":
          if (Array.isArray(operatorValue)) {
            rangeQuery[operator] = operatorValue;
          } else {
            rangeQuery[operator] = [parsedValue];
          }
          break;
        default:
          break;
      }
    });
    return Object.keys(rangeQuery).length > 0 ? rangeQuery : value;
  }
};

// src/modules/user/user.service.ts
var createAdmin = async (payload) => {
  const existsUser = await prisma.user.findUnique({
    where: { email: payload.admin.email }
  });
  if (existsUser) {
    throw new AppError_default(status5.BAD_REQUEST, "User with this email already exists");
  }
  const userData = await auth.api.signUpEmail({
    body: {
      email: payload.admin.email,
      password: payload.password,
      name: payload.admin.name,
      role: Role.ADMIN,
      needPasswordChange: true
    }
  });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const adminData = await tx.admin.create({
        data: { userId: userData.user.id, ...payload.admin }
      });
      return tx.admin.findUnique({
        where: { id: adminData.id },
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
          profilePhoto: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              status: true,
              emailVerified: true
            }
          }
        }
      });
    });
    return result;
  } catch (error) {
    console.error("createAdmin transaction error", error);
    await prisma.user.delete({ where: { id: userData.user.id } }).catch(() => null);
    throw new AppError_default(status5.INTERNAL_SERVER_ERROR, "Failed to create admin profile");
  }
};
var getAllCustomers = async (query2) => {
  const queryBuilder = new QueryBuilder(prisma.customer, query2, {
    searchableFields: ["fullName", "email", "phone", "user.name", "user.email"],
    filterableFields: ["fullName", "email", "phone", "isDeleted", "userId"]
  });
  return queryBuilder.search().filter().where({ isDeleted: false }).include({
    user: {
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true
      }
    }
  }).paginate().sort().fields().excute();
};
var userService = {
  createAdmin,
  getAllCustomers
};

// src/modules/user/user.controler.ts
var createAdmin2 = catchAsync(async (req, res) => {
  const result = await userService.createAdmin(req.body);
  sendResponse(res, {
    httpStatusCode: status6.CREATED,
    success: true,
    message: "Admin created",
    data: result
  });
});
var getAllCustomers2 = catchAsync(async (req, res) => {
  const result = await userService.getAllCustomers(req.query);
  sendResponse(res, {
    httpStatusCode: status6.OK,
    success: true,
    message: "Customers fetched",
    data: result.data,
    meta: result.meta
  });
});
var userController = {
  createAdmin: createAdmin2,
  getAllCustomers: getAllCustomers2
};

// src/modules/user/user.router.ts
var router2 = Router2();
router2.post("/admin", checkAuth(Role.ADMIN), userController.createAdmin);
router2.get("/customers", checkAuth(Role.ADMIN, Role.STAFF), userController.getAllCustomers);
var userRouter = router2;

// src/modules/admin/admin.router.ts
import { Router as Router3 } from "express";

// src/modules/admin/admin.controler.ts
import status8 from "http-status";

// src/modules/admin/admin.service.ts
import status7 from "http-status";

// src/modules/admin/admin.constant.ts
var adminSearchableFields = [
  "name",
  "email",
  "contactNumber",
  "user.role",
  "user.status"
];
var adminFilterableFields = [
  "isDeleted",
  "email",
  "contactNumber",
  "user.role",
  "user.status"
];
var adminIncludeConfig = {
  user: true
};

// src/modules/admin/admin.service.ts
var findActiveAdminById = async (id) => {
  const admin = await prisma.admin.findFirst({
    where: { id, isDeleted: false },
    include: { user: true }
  });
  if (!admin) {
    throw new AppError_default(status7.NOT_FOUND, "Admin not found");
  }
  return admin;
};
var buildAdminUpdatePayload = (payload) => {
  const data = {};
  if (payload.contactNumber !== void 0) {
    data.contactNumber = payload.contactNumber.trim();
  }
  if (payload.profilePhoto !== void 0) {
    data.profilePhoto = payload.profilePhoto.trim();
  }
  return data;
};
var getAllAdmin = async (query2) => {
  const queryBuilder = new QueryBuilder(prisma.admin, query2, {
    searchableFields: adminSearchableFields,
    filterableFields: adminFilterableFields
  });
  const result = await queryBuilder.search().filter().where({
    isDeleted: false
  }).include({
    user: true
  }).dynamicInclude(adminIncludeConfig).paginate().sort().fields().excute();
  return result;
};
var getAdminById = async (id) => {
  return findActiveAdminById(id);
};
var updateAdmin = async (id, payload) => {
  const admin = await findActiveAdminById(id);
  const updatePayload = buildAdminUpdatePayload(payload);
  if (Object.keys(updatePayload).length === 0) {
    throw new AppError_default(status7.BAD_REQUEST, "No valid admin fields provided for update");
  }
  const updatedAdmin = await prisma.admin.update({
    where: { id },
    data: updatePayload,
    include: {
      user: true
    }
  });
  return updatedAdmin;
};
var markDeleteAdmin = async (id, user) => {
  const admin = await findActiveAdminById(id);
  if (admin.userId === user.userId) {
    throw new AppError_default(status7.BAD_REQUEST, "You cannot delete yourself");
  }
  const result = await prisma.$transaction(async (tx) => {
    await tx.admin.update({
      where: { id },
      data: { isDeleted: true, deletedAt: /* @__PURE__ */ new Date() }
    });
    await tx.user.update({
      where: { id: admin.userId },
      data: { isDeleted: true, status: "DELETED" }
    });
    return true;
  });
  return result;
};
var adminService = {
  getAllAdmin,
  updateAdmin,
  getAdminById,
  markDeleteAdmin
};

// src/modules/admin/admin.controler.ts
var getAllAdmin2 = catchAsync(async (req, res) => {
  const admins = await adminService.getAllAdmin(req.query);
  sendResponse(res, {
    httpStatusCode: status8.OK,
    success: true,
    message: "Admins retrieved successfully",
    data: admins
  });
});
var getAdminById2 = catchAsync(async (req, res) => {
  const { id } = req.params;
  const admin = await adminService.getAdminById(id);
  sendResponse(res, {
    httpStatusCode: status8.OK,
    success: true,
    message: "admin retrieved successfully",
    data: admin
  });
});
var updateAdmin2 = catchAsync(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const updatedAdmin = await adminService.updateAdmin(id, data);
  sendResponse(res, {
    httpStatusCode: status8.OK,
    success: true,
    message: "Admin updated successfully",
    data: updatedAdmin
  });
});
var deleteAdmin = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const adminDoctor = await adminService.markDeleteAdmin(id, user);
  sendResponse(res, {
    httpStatusCode: status8.OK,
    success: true,
    message: "admin deleted successfully",
    data: adminDoctor
  });
});
var adminController = {
  getAllAdmin: getAllAdmin2,
  updateAdmin: updateAdmin2,
  getAdminById: getAdminById2,
  deleteAdmin
};

// src/modules/admin/admin.validation.ts
import z2 from "zod";
var adminIdParamsSchema = z2.object({
  id: z2.string().uuid("Invalid admin id")
});
var updateAdminValidationSchema = z2.object({
  params: adminIdParamsSchema,
  body: z2.object({
    contactNumber: z2.string().trim().min(1, "Contact number cannot be empty").optional(),
    profilePhoto: z2.string().trim().min(1, "Profile photo cannot be empty").optional()
  }).refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update"
  })
});
var adminIdValidationSchema = z2.object({
  params: adminIdParamsSchema
});

// src/modules/admin/admin.router.ts
var router3 = Router3();
router3.get("/", checkAuth(Role.ADMIN), adminController.getAllAdmin);
router3.get("/:id", checkAuth(Role.ADMIN), validateRequest(adminIdValidationSchema), adminController.getAdminById);
router3.put("/:id", checkAuth(Role.ADMIN), validateRequest(updateAdminValidationSchema), adminController.updateAdmin);
router3.delete("/:id", checkAuth(Role.ADMIN), validateRequest(adminIdValidationSchema), adminController.deleteAdmin);
var adminRouter = router3;

// src/modules/category/category.router.ts
import { Router as Router4 } from "express";

// src/modules/category/category.controler.ts
import status10 from "http-status";

// src/modules/category/category.service.ts
import status9 from "http-status";
var ensureUniqueSlug = async (base, ignoreId) => {
  let slug = base || "category";
  let i = 1;
  while (true) {
    const exists = await prisma.category.findUnique({ where: { slug } });
    if (!exists || exists.id === ignoreId) return slug;
    slug = `${base}-${++i}`;
  }
};
var createCategory = async (payload) => {
  const slug = await ensureUniqueSlug(slugify(payload.name));
  return prisma.category.create({
    data: {
      name: payload.name,
      slug,
      description: payload.description ?? null,
      icon: payload.icon ?? null,
      image: payload.image ?? null,
      parentId: payload.parentId ?? null,
      sortOrder: payload.sortOrder ?? 0,
      isFeatured: payload.isFeatured ?? false,
      isActive: payload.isActive ?? true
    }
  });
};
var listCategories = async (query2) => {
  const where = { isDeleted: false, isActive: true };
  if (query2.search) where.name = { contains: query2.search, mode: "insensitive" };
  if (query2.rootOnly === "true") where.parentId = null;
  else if (query2.parentId) where.parentId = query2.parentId;
  if (query2.isFeatured === "true") where.isFeatured = true;
  return prisma.category.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { children: true, _count: { select: { products: true } } }
  });
};
var getCategoryBySlug = async (slug) => {
  const category = await prisma.category.findFirst({
    where: { slug, isDeleted: false },
    include: { children: true, parent: true }
  });
  if (!category) throw new AppError_default(status9.NOT_FOUND, "Category not found");
  return category;
};
var updateCategory = async (id, payload) => {
  const existing = await prisma.category.findFirst({
    where: { id, isDeleted: false }
  });
  if (!existing) throw new AppError_default(status9.NOT_FOUND, "Category not found");
  const data = {};
  if (payload.name !== void 0) {
    data.name = payload.name;
    data.slug = await ensureUniqueSlug(slugify(payload.name), id);
  }
  for (const k of [
    "description",
    "icon",
    "image",
    "parentId",
    "sortOrder",
    "isFeatured",
    "isActive"
  ]) {
    if (payload[k] !== void 0) data[k] = payload[k];
  }
  return prisma.category.update({ where: { id }, data });
};
var deleteCategory = async (id) => {
  return prisma.category.update({
    where: { id },
    data: { isDeleted: true, deletedAt: /* @__PURE__ */ new Date(), isActive: false }
  });
};
var getCategoryTree = async () => {
  const roots = await prisma.category.findMany({
    where: { parentId: null, isDeleted: false, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      children: {
        where: { isDeleted: false, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { products: true } } }
      },
      _count: { select: { products: true } }
    }
  });
  return roots;
};
var categoryService = {
  createCategory,
  listCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  getCategoryTree
};

// src/modules/category/category.controler.ts
var create = catchAsync(async (req, res) => {
  const result = await categoryService.createCategory(req.body);
  sendResponse(res, {
    httpStatusCode: status10.CREATED,
    success: true,
    message: "Category created",
    data: result
  });
});
var list = catchAsync(async (req, res) => {
  const result = await categoryService.listCategories(req.query);
  sendResponse(res, {
    httpStatusCode: status10.OK,
    success: true,
    message: "Categories fetched",
    data: result
  });
});
var getBySlug = catchAsync(async (req, res) => {
  const result = await categoryService.getCategoryBySlug(
    req.params.slug
  );
  sendResponse(res, {
    httpStatusCode: status10.OK,
    success: true,
    message: "Category fetched",
    data: result
  });
});
var update = catchAsync(async (req, res) => {
  const result = await categoryService.updateCategory(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status10.OK,
    success: true,
    message: "Category updated",
    data: result
  });
});
var remove = catchAsync(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  sendResponse(res, {
    httpStatusCode: status10.OK,
    success: true,
    message: "Category deleted"
  });
});
var tree = catchAsync(async (_req, res) => {
  const result = await categoryService.getCategoryTree();
  sendResponse(res, {
    httpStatusCode: status10.OK,
    success: true,
    message: "Category tree fetched",
    data: result
  });
});
var categoryController = { create, list, getBySlug, update, remove, tree };

// src/modules/category/category.validation.ts
import { z as z3 } from "zod";
var createCategorySchema = z3.object({
  name: z3.string().min(2).max(120),
  description: z3.string().max(2e3).optional(),
  icon: z3.string().max(255).optional(),
  image: z3.string().url("Image must be a valid URL").max(500).optional(),
  parentId: z3.string().uuid("parentId must be a UUID").nullable().optional(),
  sortOrder: z3.number().int().min(0).optional(),
  isFeatured: z3.boolean().optional(),
  isActive: z3.boolean().optional()
});
var updateCategorySchema = createCategorySchema.partial();

// src/modules/category/category.router.ts
var router4 = Router4();
router4.get("/", categoryController.list);
router4.get("/tree", categoryController.tree);
router4.get("/:slug", categoryController.getBySlug);
router4.post(
  "/",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(createCategorySchema),
  categoryController.create
);
router4.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(updateCategorySchema),
  categoryController.update
);
router4.delete("/:id", checkAuth(Role.ADMIN), categoryController.remove);
var categoryRouter = router4;

// src/modules/brand/brand.router.ts
import { Router as Router5 } from "express";

// src/modules/brand/brand.controler.ts
import status12 from "http-status";

// src/modules/brand/brand.service.ts
import status11 from "http-status";
var ensureUniqueSlug2 = async (base, ignoreId) => {
  let slug = base || "brand";
  let i = 1;
  while (true) {
    const exists = await prisma.brand.findUnique({ where: { slug } });
    if (!exists || exists.id === ignoreId) return slug;
    slug = `${base}-${++i}`;
  }
};
var createBrand = async (payload) => {
  const slug = await ensureUniqueSlug2(slugify(payload.name));
  return prisma.brand.create({
    data: {
      name: payload.name,
      slug,
      logo: payload.logo ?? null,
      website: payload.website ?? null,
      description: payload.description ?? null,
      isFeatured: payload.isFeatured ?? false,
      isActive: payload.isActive ?? true
    }
  });
};
var listBrands = async (query2) => {
  const where = { isDeleted: false, isActive: true };
  if (query2.search) where.name = { contains: query2.search, mode: "insensitive" };
  if (query2.isFeatured === "true") where.isFeatured = true;
  return prisma.brand.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } }
  });
};
var getBrandBySlug = async (slug) => {
  const brand = await prisma.brand.findFirst({
    where: { slug, isDeleted: false }
  });
  if (!brand) throw new AppError_default(status11.NOT_FOUND, "Brand not found");
  return brand;
};
var updateBrand = async (id, payload) => {
  const existing = await prisma.brand.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError_default(status11.NOT_FOUND, "Brand not found");
  const data = {};
  if (payload.name !== void 0) {
    data.name = payload.name;
    data.slug = await ensureUniqueSlug2(slugify(payload.name), id);
  }
  for (const k of ["logo", "website", "description", "isFeatured", "isActive"]) {
    if (payload[k] !== void 0) data[k] = payload[k];
  }
  return prisma.brand.update({ where: { id }, data });
};
var deleteBrand = async (id) => {
  return prisma.brand.update({
    where: { id },
    data: { isDeleted: true, deletedAt: /* @__PURE__ */ new Date(), isActive: false }
  });
};
var brandService = {
  createBrand,
  listBrands,
  getBrandBySlug,
  updateBrand,
  deleteBrand
};

// src/modules/brand/brand.controler.ts
var create2 = catchAsync(async (req, res) => {
  const result = await brandService.createBrand(req.body);
  sendResponse(res, {
    httpStatusCode: status12.CREATED,
    success: true,
    message: "Brand created",
    data: result
  });
});
var list2 = catchAsync(async (req, res) => {
  const result = await brandService.listBrands(req.query);
  sendResponse(res, {
    httpStatusCode: status12.OK,
    success: true,
    message: "Brands fetched",
    data: result
  });
});
var getBySlug2 = catchAsync(async (req, res) => {
  const result = await brandService.getBrandBySlug(req.params.slug);
  sendResponse(res, {
    httpStatusCode: status12.OK,
    success: true,
    message: "Brand fetched",
    data: result
  });
});
var update2 = catchAsync(async (req, res) => {
  const result = await brandService.updateBrand(req.params.id, req.body);
  sendResponse(res, {
    httpStatusCode: status12.OK,
    success: true,
    message: "Brand updated",
    data: result
  });
});
var remove2 = catchAsync(async (req, res) => {
  await brandService.deleteBrand(req.params.id);
  sendResponse(res, {
    httpStatusCode: status12.OK,
    success: true,
    message: "Brand deleted"
  });
});
var brandController = { create: create2, list: list2, getBySlug: getBySlug2, update: update2, remove: remove2 };

// src/modules/brand/brand.validation.ts
import { z as z4 } from "zod";
var createBrandSchema = z4.object({
  name: z4.string().min(1).max(120),
  logo: z4.string().url("Logo must be a valid URL").max(500).optional(),
  website: z4.string().url("Website must be a valid URL").max(500).optional(),
  description: z4.string().max(2e3).optional(),
  isFeatured: z4.boolean().optional(),
  isActive: z4.boolean().optional()
});
var updateBrandSchema = createBrandSchema.partial();

// src/modules/brand/brand.router.ts
var router5 = Router5();
router5.get("/", brandController.list);
router5.get("/:slug", brandController.getBySlug);
router5.post(
  "/",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(createBrandSchema),
  brandController.create
);
router5.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(updateBrandSchema),
  brandController.update
);
router5.delete("/:id", checkAuth(Role.ADMIN), brandController.remove);
var brandRouter = router5;

// src/modules/product/product.router.ts
import { Router as Router7 } from "express";

// src/modules/product/product.controler.ts
import status14 from "http-status";

// src/modules/product/product.service.ts
import status13 from "http-status";
var ensureUniqueSlug3 = async (base, ignoreId) => {
  let slug = base || "product";
  let i = 1;
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${++i}`;
  }
};
var createProduct = async (payload) => {
  if (!payload.sellerId) {
    throw new AppError_default(status13.BAD_REQUEST, "sellerId is required");
  }
  const seller = await prisma.seller.findUnique({
    where: { id: payload.sellerId },
    select: { id: true, status: true, isDeleted: true }
  });
  if (!seller || seller.isDeleted) {
    throw new AppError_default(status13.NOT_FOUND, "Seller not found");
  }
  if (seller.status !== SellerStatus.APPROVED) {
    throw new AppError_default(
      status13.FORBIDDEN,
      `Seller is not approved (status: ${seller.status})`
    );
  }
  const slug = await ensureUniqueSlug3(slugify(payload.name));
  const product = await prisma.product.create({
    data: {
      name: payload.name,
      slug,
      sku: payload.sku,
      shortDesc: payload.shortDesc ?? null,
      description: payload.description,
      price: payload.price,
      compareAtPrice: payload.compareAtPrice ?? null,
      costPerItem: payload.costPerItem ?? null,
      currency: payload.currency ?? "USD",
      stock: payload.stock ?? 0,
      lowStockAlert: payload.lowStockAlert ?? 5,
      trackInventory: payload.trackInventory ?? true,
      allowBackorder: payload.allowBackorder ?? false,
      weightGrams: payload.weightGrams,
      widthMm: payload.widthMm,
      heightMm: payload.heightMm,
      depthMm: payload.depthMm,
      status: payload.status ?? ProductStatus.DRAFT,
      condition: payload.condition ?? ProductCondition.NEW,
      isFeatured: payload.isFeatured ?? false,
      isBestseller: payload.isBestseller ?? false,
      isNewArrival: payload.isNewArrival ?? false,
      isOnSale: payload.isOnSale ?? false,
      metaTitle: payload.metaTitle,
      metaDescription: payload.metaDescription,
      brandId: payload.brandId ?? null,
      categoryId: payload.categoryId,
      sellerId: payload.sellerId,
      publishedAt: payload.status === ProductStatus.ACTIVE ? /* @__PURE__ */ new Date() : null,
      images: payload.images?.length ? { create: payload.images.map((img, idx) => ({
        url: img.url,
        alt: img.alt,
        isPrimary: img.isPrimary ?? idx === 0,
        sortOrder: img.sortOrder ?? idx
      })) } : void 0,
      specifications: payload.specifications?.length ? { create: payload.specifications } : void 0,
      tags: payload.tagIds?.length ? { connect: payload.tagIds.map((id) => ({ id })) } : void 0
    },
    include: {
      images: true,
      specifications: true,
      tags: true,
      brand: true,
      category: true,
      variants: true
    }
  });
  await prisma.seller.update({
    where: { id: payload.sellerId },
    data: { productCount: { increment: 1 } }
  }).catch(() => null);
  return product;
};
var resolveActorSellerId = async (user, bodySellerId) => {
  if (user.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: user.userId },
      select: { id: true, status: true, isDeleted: true }
    });
    if (!seller || seller.isDeleted) {
      throw new AppError_default(status13.FORBIDDEN, "You don't have a seller profile");
    }
    if (seller.status !== SellerStatus.APPROVED) {
      throw new AppError_default(
        status13.FORBIDDEN,
        `Your shop is not approved (status: ${seller.status})`
      );
    }
    return seller.id;
  }
  if (!bodySellerId) {
    throw new AppError_default(
      status13.BAD_REQUEST,
      "sellerId is required when creating on behalf of a seller"
    );
  }
  return bodySellerId;
};
var listProducts = async (q) => {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(q.limit) || 20));
  const skip = (page - 1) * limit;
  const where = {
    isDeleted: false,
    status: q.status ?? ProductStatus.ACTIVE
  };
  if (q.search)
    where.OR = [
      { name: { contains: q.search, mode: "insensitive" } },
      { shortDesc: { contains: q.search, mode: "insensitive" } },
      { description: { contains: q.search, mode: "insensitive" } }
    ];
  if (q.categoryId) where.categoryId = q.categoryId;
  if (q.brandId) where.brandId = q.brandId;
  if (q.sellerId) where.sellerId = q.sellerId;
  if (q.sellerSlug) where.seller = { shopSlug: q.sellerSlug, status: SellerStatus.APPROVED };
  if (q.condition) where.condition = q.condition;
  if (q.isFeatured === "true") where.isFeatured = true;
  if (q.isBestseller === "true") where.isBestseller = true;
  if (q.isNewArrival === "true") where.isNewArrival = true;
  if (q.isOnSale === "true") where.isOnSale = true;
  if (q.minPrice || q.maxPrice) {
    where.price = {};
    if (q.minPrice) where.price.gte = Number(q.minPrice);
    if (q.maxPrice) where.price.lte = Number(q.maxPrice);
  }
  if (q.tagId) where.tags = { some: { id: q.tagId } };
  const sortBy = q.sortBy ?? "createdAt";
  const sortOrder = q.sortOrder ?? "desc";
  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        brand: true,
        category: true,
        seller: {
          select: { id: true, shopName: true, shopSlug: true, logo: true, avgRating: true }
        }
      }
    }),
    prisma.product.count({ where })
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};
var getProductBySlug = async (slug) => {
  const product = await prisma.product.findFirst({
    where: { slug, isDeleted: false },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true } },
      specifications: { orderBy: { sortOrder: "asc" } },
      tags: true,
      brand: true,
      category: true
    }
  });
  if (!product) throw new AppError_default(status13.NOT_FOUND, "Product not found");
  prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => null);
  return product;
};
var getProductById = async (id) => {
  const product = await prisma.product.findFirst({
    where: { id, isDeleted: false },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      specifications: { orderBy: { sortOrder: "asc" } },
      tags: true,
      brand: true,
      category: true
    }
  });
  if (!product) throw new AppError_default(status13.NOT_FOUND, "Product not found");
  return product;
};
var updateProduct = async (id, payload, actor) => {
  const existing = await prisma.product.findFirst({
    where: { id, isDeleted: false }
  });
  if (!existing) throw new AppError_default(status13.NOT_FOUND, "Product not found");
  if (actor && actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true }
    });
    if (!seller || seller.id !== existing.sellerId) {
      throw new AppError_default(status13.FORBIDDEN, "You can only edit your own products");
    }
  }
  const data = {};
  if (payload.name !== void 0) {
    data.name = payload.name;
    data.slug = await ensureUniqueSlug3(slugify(payload.name), id);
  }
  for (const k of [
    "sku",
    "shortDesc",
    "description",
    "price",
    "compareAtPrice",
    "costPerItem",
    "currency",
    "stock",
    "lowStockAlert",
    "trackInventory",
    "allowBackorder",
    "weightGrams",
    "widthMm",
    "heightMm",
    "depthMm",
    "status",
    "condition",
    "isFeatured",
    "isBestseller",
    "isNewArrival",
    "isOnSale",
    "metaTitle",
    "metaDescription",
    "brandId",
    "categoryId"
  ]) {
    if (payload[k] !== void 0) data[k] = payload[k];
  }
  if (payload.status === ProductStatus.ACTIVE && !existing.publishedAt) {
    data.publishedAt = /* @__PURE__ */ new Date();
  }
  return prisma.product.update({ where: { id }, data });
};
var deleteProduct = async (id, actor) => {
  const existing = await prisma.product.findFirst({
    where: { id, isDeleted: false },
    select: { id: true, sellerId: true }
  });
  if (!existing) throw new AppError_default(status13.NOT_FOUND, "Product not found");
  if (actor && actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true }
    });
    if (!seller || seller.id !== existing.sellerId) {
      throw new AppError_default(status13.FORBIDDEN, "You can only delete your own products");
    }
  }
  const updated = await prisma.product.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: /* @__PURE__ */ new Date(),
      status: ProductStatus.ARCHIVED
    }
  });
  await prisma.seller.update({
    where: { id: existing.sellerId },
    data: { productCount: { decrement: 1 } }
  }).catch(() => null);
  return updated;
};
var productService = {
  createProduct,
  listProducts,
  getProductBySlug,
  getProductById,
  updateProduct,
  deleteProduct,
  resolveActorSellerId
};

// src/modules/product/product.controler.ts
var create3 = catchAsync(async (req, res) => {
  const sellerId = await productService.resolveActorSellerId(
    { userId: req.user.userId, role: req.user.role },
    req.body?.sellerId
  );
  const result = await productService.createProduct({ ...req.body, sellerId });
  sendResponse(res, {
    httpStatusCode: status14.CREATED,
    success: true,
    message: "Product created",
    data: result
  });
});
var list3 = catchAsync(async (req, res) => {
  const result = await productService.listProducts(req.query);
  sendResponse(res, {
    httpStatusCode: status14.OK,
    success: true,
    message: "Products fetched",
    data: result.data,
    meta: result.meta
  });
});
var getBySlug3 = catchAsync(async (req, res) => {
  const result = await productService.getProductBySlug(req.params.slug);
  sendResponse(res, {
    httpStatusCode: status14.OK,
    success: true,
    message: "Product fetched",
    data: result
  });
});
var getById = catchAsync(async (req, res) => {
  const result = await productService.getProductById(req.params.id);
  sendResponse(res, {
    httpStatusCode: status14.OK,
    success: true,
    message: "Product fetched",
    data: result
  });
});
var update3 = catchAsync(async (req, res) => {
  const result = await productService.updateProduct(
    req.params.id,
    req.body,
    { userId: req.user.userId, role: req.user.role }
  );
  sendResponse(res, {
    httpStatusCode: status14.OK,
    success: true,
    message: "Product updated",
    data: result
  });
});
var remove3 = catchAsync(async (req, res) => {
  await productService.deleteProduct(req.params.id, {
    userId: req.user.userId,
    role: req.user.role
  });
  sendResponse(res, {
    httpStatusCode: status14.OK,
    success: true,
    message: "Product deleted"
  });
});
var productController = { create: create3, list: list3, getBySlug: getBySlug3, getById, update: update3, remove: remove3 };

// src/modules/product/product.validation.ts
import { z as z5 } from "zod";
var imageInput = z5.object({
  url: z5.string().url("Image URL must be a valid URL").max(800),
  alt: z5.string().max(200).optional(),
  isPrimary: z5.boolean().optional(),
  sortOrder: z5.number().int().min(0).optional()
});
var specInput = z5.object({
  group: z5.string().max(80).optional(),
  label: z5.string().min(1).max(120),
  value: z5.string().min(1).max(400),
  sortOrder: z5.number().int().min(0).optional()
});
var createProductSchema = z5.object({
  name: z5.string().min(2).max(200),
  sku: z5.string().min(1).max(80),
  shortDesc: z5.string().max(500).optional(),
  description: z5.string().min(1),
  price: z5.number().positive("Price must be greater than 0"),
  compareAtPrice: z5.number().positive().optional(),
  costPerItem: z5.number().nonnegative().optional(),
  currency: z5.string().length(3).optional(),
  stock: z5.number().int().nonnegative().optional(),
  lowStockAlert: z5.number().int().nonnegative().optional(),
  trackInventory: z5.boolean().optional(),
  allowBackorder: z5.boolean().optional(),
  weightGrams: z5.number().int().nonnegative().optional(),
  widthMm: z5.number().int().nonnegative().optional(),
  heightMm: z5.number().int().nonnegative().optional(),
  depthMm: z5.number().int().nonnegative().optional(),
  status: z5.enum(["DRAFT", "ACTIVE", "ARCHIVED", "OUT_OF_STOCK"]).optional(),
  condition: z5.enum(["NEW", "REFURBISHED", "OPEN_BOX", "USED"]).optional(),
  isFeatured: z5.boolean().optional(),
  isBestseller: z5.boolean().optional(),
  isNewArrival: z5.boolean().optional(),
  isOnSale: z5.boolean().optional(),
  metaTitle: z5.string().max(200).optional(),
  metaDescription: z5.string().max(500).optional(),
  brandId: z5.string().uuid("brandId must be a UUID").nullable().optional(),
  categoryId: z5.string().uuid("categoryId must be a UUID"),
  // Optional in payload — sellers ignore this (resolved from session);
  // admins/staff may pass it to create on behalf of a seller.
  sellerId: z5.string().uuid("sellerId must be a UUID").optional(),
  images: z5.array(imageInput).optional(),
  specifications: z5.array(specInput).optional(),
  tagIds: z5.array(z5.string().uuid()).optional()
});
var updateProductSchema = createProductSchema.partial();

// src/modules/product/productVariant.router.ts
import { Router as Router6 } from "express";

// src/modules/product/productVariant.controler.ts
import status16 from "http-status";

// src/modules/product/productVariant.service.ts
import status15 from "http-status";
var ensureProductExists = async (productId) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, isDeleted: false },
    select: { id: true }
  });
  if (!product) throw new AppError_default(status15.NOT_FOUND, "Product not found");
};
var listForProduct = async (productId) => {
  await ensureProductExists(productId);
  return prisma.productVariant.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" }
  });
};
var create4 = async (productId, payload) => {
  await ensureProductExists(productId);
  const skuClash = await prisma.productVariant.findUnique({
    where: { sku: payload.sku }
  });
  if (skuClash) {
    throw new AppError_default(status15.CONFLICT, `SKU ${payload.sku} already exists`);
  }
  return prisma.productVariant.create({
    data: {
      productId,
      sku: payload.sku,
      name: payload.name,
      attributes: payload.attributes,
      price: payload.price,
      compareAtPrice: payload.compareAtPrice ?? null,
      stock: payload.stock ?? 0,
      image: payload.image ?? null,
      isActive: payload.isActive ?? true
    }
  });
};
var update4 = async (productId, variantId, payload) => {
  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, productId }
  });
  if (!existing) throw new AppError_default(status15.NOT_FOUND, "Variant not found");
  if (payload.sku && payload.sku !== existing.sku) {
    const clash = await prisma.productVariant.findUnique({
      where: { sku: payload.sku }
    });
    if (clash) {
      throw new AppError_default(status15.CONFLICT, `SKU ${payload.sku} already exists`);
    }
  }
  const data = {};
  if (payload.sku !== void 0) data.sku = payload.sku;
  if (payload.name !== void 0) data.name = payload.name;
  if (payload.attributes !== void 0) data.attributes = payload.attributes;
  if (payload.price !== void 0) data.price = payload.price;
  if (payload.compareAtPrice !== void 0) data.compareAtPrice = payload.compareAtPrice;
  if (payload.stock !== void 0) data.stock = payload.stock;
  if (payload.image !== void 0) data.image = payload.image;
  if (payload.isActive !== void 0) data.isActive = payload.isActive;
  return prisma.productVariant.update({ where: { id: variantId }, data });
};
var remove4 = async (productId, variantId) => {
  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, productId }
  });
  if (!existing) throw new AppError_default(status15.NOT_FOUND, "Variant not found");
  const linked = await prisma.orderItem.count({
    where: { variantId }
  });
  if (linked > 0) {
    return prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false }
    });
  }
  await prisma.cartItem.deleteMany({ where: { variantId } });
  return prisma.productVariant.delete({ where: { id: variantId } });
};
var productVariantService = {
  listForProduct,
  create: create4,
  update: update4,
  remove: remove4
};

// src/modules/product/productVariant.controler.ts
var list4 = catchAsync(async (req, res) => {
  const result = await productVariantService.listForProduct(
    req.params.productId
  );
  sendResponse(res, {
    httpStatusCode: status16.OK,
    success: true,
    message: "Variants fetched",
    data: result
  });
});
var create5 = catchAsync(async (req, res) => {
  const result = await productVariantService.create(
    req.params.productId,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status16.CREATED,
    success: true,
    message: "Variant created",
    data: result
  });
});
var update5 = catchAsync(async (req, res) => {
  const result = await productVariantService.update(
    req.params.productId,
    req.params.variantId,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status16.OK,
    success: true,
    message: "Variant updated",
    data: result
  });
});
var remove5 = catchAsync(async (req, res) => {
  await productVariantService.remove(
    req.params.productId,
    req.params.variantId
  );
  sendResponse(res, {
    httpStatusCode: status16.OK,
    success: true,
    message: "Variant removed"
  });
});
var productVariantController = { list: list4, create: create5, update: update5, remove: remove5 };

// src/modules/product/productVariant.validation.ts
import { z as z6 } from "zod";
var attributeValue = z6.union([z6.string(), z6.number(), z6.boolean()]);
var createVariantSchema = z6.object({
  sku: z6.string().min(1).max(80),
  name: z6.string().min(1).max(200),
  attributes: z6.record(z6.string(), attributeValue),
  price: z6.number().positive("Price must be greater than 0"),
  compareAtPrice: z6.number().positive().nullable().optional(),
  stock: z6.number().int().nonnegative().optional(),
  image: z6.string().url().max(800).nullable().optional(),
  isActive: z6.boolean().optional()
});
var updateVariantSchema = createVariantSchema.partial();

// src/modules/product/productVariant.router.ts
var router6 = Router6({ mergeParams: true });
router6.get("/", productVariantController.list);
router6.post(
  "/",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(createVariantSchema),
  productVariantController.create
);
router6.patch(
  "/:variantId",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(updateVariantSchema),
  productVariantController.update
);
router6.delete(
  "/:variantId",
  checkAuth(Role.ADMIN),
  productVariantController.remove
);
var productVariantRouter = router6;

// src/modules/product/product.router.ts
var router7 = Router7();
router7.use("/:productId/variants", productVariantRouter);
router7.get("/", productController.list);
router7.get("/by-id/:id", productController.getById);
router7.get("/:slug", productController.getBySlug);
router7.post(
  "/",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(createProductSchema),
  productController.create
);
router7.patch(
  "/:id",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(updateProductSchema),
  productController.update
);
router7.delete(
  "/:id",
  checkAuth(Role.SELLER, Role.ADMIN),
  productController.remove
);
var productRouter = router7;

// src/modules/seller/seller.router.ts
import { Router as Router8 } from "express";

// src/modules/seller/seller.controler.ts
import status18 from "http-status";

// src/modules/seller/seller.service.ts
import status17 from "http-status";
var ensureUniqueShopSlug = async (base, ignoreId) => {
  let slug = base || "shop";
  let i = 1;
  for (let attempt = 0; attempt < 25; attempt++) {
    const existing = await prisma.seller.findUnique({ where: { shopSlug: slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${++i}`;
  }
  throw new AppError_default(status17.CONFLICT, "Could not generate a unique shop slug");
};
var notifyAllAdmins = async (type, title, message, actionUrl, metadata) => {
  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN, isDeleted: false },
    select: { id: true }
  });
  if (admins.length === 0) return;
  await notificationService.createNotificationsForUsers(
    admins.map((a) => a.id),
    { type, title, message, actionUrl, metadata }
  );
};
var listPublicShops = async (queryParams) => {
  const qb = new QueryBuilder(
    prisma.seller,
    queryParams,
    {
      searchableFields: ["shopName", "tagline", "description"],
      filterableFields: ["country", "businessType"]
    }
  );
  const baseWhere = {
    status: SellerStatus.APPROVED,
    isDeleted: false
  };
  qb.search().filter().sort().paginate();
  const built = qb.getQuery();
  built.where = { ...baseWhere, ...built.where ?? {} };
  built.select = {
    id: true,
    shopName: true,
    shopSlug: true,
    tagline: true,
    logo: true,
    banner: true,
    avgRating: true,
    reviewCount: true,
    productCount: true,
    country: true,
    createdAt: true
  };
  const [data, total] = await Promise.all([
    prisma.seller.findMany(built),
    prisma.seller.count({ where: built.where })
  ]);
  return {
    data,
    meta: {
      page: Number(queryParams.page) || 1,
      limit: Number(queryParams.limit) || 10,
      total,
      totalPages: Math.ceil(total / (Number(queryParams.limit) || 10))
    }
  };
};
var getPublicShopBySlug = async (slug) => {
  const seller = await prisma.seller.findFirst({
    where: { shopSlug: slug, status: SellerStatus.APPROVED, isDeleted: false },
    select: {
      id: true,
      shopName: true,
      shopSlug: true,
      tagline: true,
      description: true,
      logo: true,
      banner: true,
      websiteUrl: true,
      country: true,
      city: true,
      returnPolicy: true,
      shippingPolicy: true,
      avgRating: true,
      reviewCount: true,
      productCount: true,
      orderCount: true,
      createdAt: true
    }
  });
  if (!seller) throw new AppError_default(status17.NOT_FOUND, "Shop not found");
  return seller;
};
var applyAsSeller = async (userId, payload) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { seller: true }
  });
  if (!user) throw new AppError_default(status17.NOT_FOUND, "User not found");
  if (user.isDeleted || user.status !== UserStatus.ACTIVE) {
    throw new AppError_default(status17.FORBIDDEN, "Account is not eligible to apply");
  }
  if (user.seller) {
    throw new AppError_default(
      status17.CONFLICT,
      `You already have a seller profile (status: ${user.seller.status})`
    );
  }
  const shopSlug = await ensureUniqueShopSlug(slugify(payload.shopName));
  const seller = await prisma.seller.create({
    data: {
      userId,
      shopName: payload.shopName,
      shopSlug,
      tagline: payload.tagline,
      description: payload.description,
      logo: payload.logo,
      banner: payload.banner,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      websiteUrl: payload.websiteUrl,
      legalName: payload.legalName,
      businessType: payload.businessType,
      taxId: payload.taxId,
      registrationNo: payload.registrationNo,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      postalCode: payload.postalCode,
      returnPolicy: payload.returnPolicy,
      shippingPolicy: payload.shippingPolicy,
      payoutMethod: payload.payoutMethod ?? PayoutMethod.MANUAL_BANK,
      bankAccountHolderName: payload.bankAccountHolderName,
      bankAccountNumber: payload.bankAccountNumber,
      bankRoutingNumber: payload.bankRoutingNumber,
      bankName: payload.bankName,
      bankCountry: payload.bankCountry,
      status: SellerStatus.PENDING,
      kycStatus: KycStatus.NOT_SUBMITTED,
      applicationData: payload
    }
  });
  await notificationService.createNotification({
    userId,
    type: NotificationType.SELLER_APPLICATION_RECEIVED,
    title: "Seller application received",
    message: `Thanks! We've received your application for "${seller.shopName}" and will review it shortly.`,
    actionUrl: "/seller/dashboard"
  });
  await notifyAllAdmins(
    NotificationType.NEW_SELLER_APPLICATION,
    "New seller application",
    `${user.name} applied to open shop "${seller.shopName}".`,
    `/admin/sellers/${seller.id}`,
    { sellerId: seller.id, userId }
  );
  return seller;
};
var getMySeller = async (userId) => {
  const seller = await prisma.seller.findUnique({ where: { userId } });
  if (!seller) throw new AppError_default(status17.NOT_FOUND, "You don't have a seller profile yet");
  return seller;
};
var updateMyShop = async (userId, payload) => {
  const seller = await prisma.seller.findUnique({ where: { userId } });
  if (!seller) throw new AppError_default(status17.NOT_FOUND, "You don't have a seller profile");
  if (seller.isDeleted) throw new AppError_default(status17.GONE, "Seller profile is closed");
  if (seller.status === SellerStatus.SUSPENDED) {
    throw new AppError_default(status17.FORBIDDEN, "Your shop is suspended");
  }
  const data = { ...payload };
  if (payload.shopName && payload.shopName !== seller.shopName) {
    data.shopSlug = await ensureUniqueShopSlug(slugify(payload.shopName), seller.id);
  }
  return prisma.seller.update({ where: { id: seller.id }, data });
};
var adminListSellers = async (queryParams) => {
  const qb = new QueryBuilder(prisma.seller, queryParams, {
    searchableFields: ["shopName", "shopSlug", "contactEmail", "legalName"],
    filterableFields: ["status", "kycStatus", "country", "isDeleted"]
  });
  qb.search().filter().sort().paginate();
  const built = qb.getQuery();
  built.include = {
    user: { select: { id: true, name: true, email: true, status: true } }
  };
  const [data, total] = await Promise.all([
    prisma.seller.findMany(built),
    prisma.seller.count({ where: built.where })
  ]);
  return {
    data,
    meta: {
      page: Number(queryParams.page) || 1,
      limit: Number(queryParams.limit) || 10,
      total,
      totalPages: Math.ceil(total / (Number(queryParams.limit) || 10))
    }
  };
};
var adminGetSeller = async (id) => {
  const seller = await prisma.seller.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, status: true } },
      _count: { select: { products: true, sellerOrders: true, payouts: true } }
    }
  });
  if (!seller) throw new AppError_default(status17.NOT_FOUND, "Seller not found");
  return seller;
};
var adminApproveSeller = async (id, adminUserId, payload) => {
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) throw new AppError_default(status17.NOT_FOUND, "Seller not found");
  if (seller.status === SellerStatus.APPROVED) {
    throw new AppError_default(status17.CONFLICT, "Seller is already approved");
  }
  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.seller.update({
      where: { id },
      data: {
        status: SellerStatus.APPROVED,
        rejectionReason: null,
        suspensionReason: null,
        approvedAt: /* @__PURE__ */ new Date(),
        approvedById: adminUserId,
        commissionRate: payload.commissionRate ?? seller.commissionRate ?? null
      }
    });
    await tx.user.update({
      where: { id: seller.userId },
      data: { role: Role.SELLER }
    });
    return s;
  });
  await notificationService.createNotification({
    userId: seller.userId,
    type: NotificationType.SELLER_APPROVED,
    title: "Your shop is live",
    message: `Congratulations! "${seller.shopName}" has been approved. You can now list products.`,
    actionUrl: "/seller/dashboard"
  });
  return updated;
};
var adminRejectSeller = async (id, _adminUserId, payload) => {
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) throw new AppError_default(status17.NOT_FOUND, "Seller not found");
  if (seller.status === SellerStatus.APPROVED) {
    throw new AppError_default(
      status17.CONFLICT,
      "Seller is already approved. Use suspend instead."
    );
  }
  const updated = await prisma.seller.update({
    where: { id },
    data: {
      status: SellerStatus.REJECTED,
      rejectedAt: /* @__PURE__ */ new Date(),
      rejectionReason: payload.reason
    }
  });
  await notificationService.createNotification({
    userId: seller.userId,
    type: NotificationType.SELLER_REJECTED,
    title: "Seller application rejected",
    message: payload.reason,
    actionUrl: "/seller/apply"
  });
  return updated;
};
var adminSuspendSeller = async (id, _adminUserId, payload) => {
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) throw new AppError_default(status17.NOT_FOUND, "Seller not found");
  const updated = await prisma.seller.update({
    where: { id },
    data: {
      status: SellerStatus.SUSPENDED,
      suspendedAt: /* @__PURE__ */ new Date(),
      suspensionReason: payload.reason
    }
  });
  await prisma.product.updateMany({
    where: { sellerId: id, isDeleted: false },
    data: { status: "ARCHIVED" }
  });
  await notificationService.createNotification({
    userId: seller.userId,
    type: NotificationType.SELLER_SUSPENDED,
    title: "Your shop has been suspended",
    message: payload.reason,
    actionUrl: "/seller/dashboard"
  });
  return updated;
};
var adminReinstateSeller = async (id, _adminUserId) => {
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) throw new AppError_default(status17.NOT_FOUND, "Seller not found");
  if (seller.status !== SellerStatus.SUSPENDED) {
    throw new AppError_default(status17.CONFLICT, "Seller is not suspended");
  }
  return prisma.seller.update({
    where: { id },
    data: {
      status: SellerStatus.APPROVED,
      suspensionReason: null,
      suspendedAt: null
    }
  });
};
var getMyDashboard = async (userId) => {
  const seller = await prisma.seller.findUnique({ where: { userId } });
  if (!seller) throw new AppError_default(status17.NOT_FOUND, "Seller profile not found");
  const today = /* @__PURE__ */ new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [
    productCount,
    activeProductCount,
    lowStockProductCount,
    pendingSellerOrders,
    monthSellerOrders,
    monthSales,
    pendingPayout,
    paidPayout
  ] = await Promise.all([
    prisma.product.count({ where: { sellerId: seller.id, isDeleted: false } }),
    prisma.product.count({
      where: { sellerId: seller.id, isDeleted: false, status: "ACTIVE" }
    }),
    prisma.product.count({
      where: {
        sellerId: seller.id,
        isDeleted: false,
        trackInventory: true,
        stock: { lte: 5 }
      }
    }),
    prisma.sellerOrder.count({
      where: { sellerId: seller.id, status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } }
    }),
    prisma.sellerOrder.count({
      where: { sellerId: seller.id, createdAt: { gte: startOfMonth } }
    }),
    prisma.sellerOrder.aggregate({
      where: {
        sellerId: seller.id,
        status: { in: ["DELIVERED"] },
        createdAt: { gte: startOfMonth }
      },
      _sum: { payoutAmount: true }
    }),
    prisma.sellerPayout.aggregate({
      where: { sellerId: seller.id, status: { in: ["PENDING", "PROCESSING"] } },
      _sum: { netAmount: true }
    }),
    prisma.sellerPayout.aggregate({
      where: { sellerId: seller.id, status: "PAID" },
      _sum: { netAmount: true }
    })
  ]);
  return {
    seller: {
      id: seller.id,
      shopName: seller.shopName,
      shopSlug: seller.shopSlug,
      logo: seller.logo,
      status: seller.status,
      avgRating: seller.avgRating,
      reviewCount: seller.reviewCount,
      totalSales: seller.totalSales
    },
    products: {
      total: productCount,
      active: activeProductCount,
      lowStock: lowStockProductCount
    },
    orders: {
      pending: pendingSellerOrders,
      thisMonth: monthSellerOrders
    },
    revenue: {
      thisMonth: monthSales._sum.payoutAmount ?? 0,
      pendingPayout: pendingPayout._sum.netAmount ?? 0,
      paidPayout: paidPayout._sum.netAmount ?? 0
    }
  };
};
var sellerService = {
  // Public
  listPublicShops,
  getPublicShopBySlug,
  // Self
  applyAsSeller,
  getMySeller,
  updateMyShop,
  getMyDashboard,
  // Admin
  adminListSellers,
  adminGetSeller,
  adminApproveSeller,
  adminRejectSeller,
  adminSuspendSeller,
  adminReinstateSeller
};

// src/modules/seller/seller.controler.ts
var listPublicShops2 = catchAsync(async (req, res) => {
  const result = await sellerService.listPublicShops(req.query);
  sendResponse(res, {
    httpStatusCode: status18.OK,
    success: true,
    message: "Shops fetched",
    data: result.data,
    meta: result.meta
  });
});
var getPublicShopBySlug2 = catchAsync(async (req, res) => {
  const result = await sellerService.getPublicShopBySlug(req.params.slug);
  sendResponse(res, {
    httpStatusCode: status18.OK,
    success: true,
    message: "Shop fetched",
    data: result
  });
});
var applyAsSeller2 = catchAsync(async (req, res) => {
  const result = await sellerService.applyAsSeller(req.user.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status18.CREATED,
    success: true,
    message: "Seller application submitted",
    data: result
  });
});
var getMySeller2 = catchAsync(async (req, res) => {
  const result = await sellerService.getMySeller(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status18.OK,
    success: true,
    message: "Seller profile fetched",
    data: result
  });
});
var updateMyShop2 = catchAsync(async (req, res) => {
  const result = await sellerService.updateMyShop(req.user.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status18.OK,
    success: true,
    message: "Shop updated",
    data: result
  });
});
var getMyDashboard2 = catchAsync(async (req, res) => {
  const result = await sellerService.getMyDashboard(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status18.OK,
    success: true,
    message: "Dashboard fetched",
    data: result
  });
});
var adminListSellers2 = catchAsync(async (req, res) => {
  const result = await sellerService.adminListSellers(req.query);
  sendResponse(res, {
    httpStatusCode: status18.OK,
    success: true,
    message: "Sellers fetched",
    data: result.data,
    meta: result.meta
  });
});
var adminGetSeller2 = catchAsync(async (req, res) => {
  const result = await sellerService.adminGetSeller(req.params.id);
  sendResponse(res, {
    httpStatusCode: status18.OK,
    success: true,
    message: "Seller fetched",
    data: result
  });
});
var adminApproveSeller2 = catchAsync(async (req, res) => {
  const result = await sellerService.adminApproveSeller(
    req.params.id,
    req.user.userId,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status18.OK,
    success: true,
    message: "Seller approved",
    data: result
  });
});
var adminRejectSeller2 = catchAsync(async (req, res) => {
  const result = await sellerService.adminRejectSeller(
    req.params.id,
    req.user.userId,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status18.OK,
    success: true,
    message: "Seller application rejected",
    data: result
  });
});
var adminSuspendSeller2 = catchAsync(async (req, res) => {
  const result = await sellerService.adminSuspendSeller(
    req.params.id,
    req.user.userId,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status18.OK,
    success: true,
    message: "Seller suspended",
    data: result
  });
});
var adminReinstateSeller2 = catchAsync(async (req, res) => {
  const result = await sellerService.adminReinstateSeller(
    req.params.id,
    req.user.userId
  );
  sendResponse(res, {
    httpStatusCode: status18.OK,
    success: true,
    message: "Seller reinstated",
    data: result
  });
});
var sellerController = {
  listPublicShops: listPublicShops2,
  getPublicShopBySlug: getPublicShopBySlug2,
  applyAsSeller: applyAsSeller2,
  getMySeller: getMySeller2,
  updateMyShop: updateMyShop2,
  getMyDashboard: getMyDashboard2,
  adminListSellers: adminListSellers2,
  adminGetSeller: adminGetSeller2,
  adminApproveSeller: adminApproveSeller2,
  adminRejectSeller: adminRejectSeller2,
  adminSuspendSeller: adminSuspendSeller2,
  adminReinstateSeller: adminReinstateSeller2
};

// src/modules/seller/seller.validation.ts
import { z as z7 } from "zod";
var optionalUrl = z7.string().url().max(500).optional();
var country2 = z7.string().length(2, "Country must be ISO-3166 alpha-2 (e.g. US, BD)").toUpperCase();
var applyAsSellerSchema = z7.object({
  shopName: z7.string().min(2).max(120),
  tagline: z7.string().max(200).optional(),
  description: z7.string().max(5e3).optional(),
  logo: optionalUrl,
  banner: optionalUrl,
  contactEmail: z7.string().email().max(160),
  contactPhone: z7.string().max(40).optional(),
  websiteUrl: optionalUrl,
  legalName: z7.string().max(200).optional(),
  businessType: z7.enum(["INDIVIDUAL", "COMPANY", "LLC", "PARTNERSHIP", "OTHER"]).optional(),
  taxId: z7.string().max(80).optional(),
  registrationNo: z7.string().max(120).optional(),
  addressLine1: z7.string().max(200).optional(),
  addressLine2: z7.string().max(200).optional(),
  city: z7.string().max(120).optional(),
  state: z7.string().max(120).optional(),
  country: country2.optional(),
  postalCode: z7.string().max(20).optional(),
  returnPolicy: z7.string().max(1e4).optional(),
  shippingPolicy: z7.string().max(1e4).optional(),
  // Payout intent
  payoutMethod: z7.enum(["STRIPE_CONNECT", "MANUAL_BANK"]).optional(),
  bankAccountHolderName: z7.string().max(200).optional(),
  bankAccountNumber: z7.string().max(80).optional(),
  bankRoutingNumber: z7.string().max(80).optional(),
  bankName: z7.string().max(200).optional(),
  bankCountry: country2.optional()
});
var updateMyShopSchema = applyAsSellerSchema.partial().extend({
  // shopName changes invalidate cached shop URLs — keep but allow.
  shopName: z7.string().min(2).max(120).optional()
});
var adminApproveSellerSchema = z7.object({
  commissionRate: z7.number().min(0).max(100).optional().describe("Platform commission %. Falls back to platform default."),
  note: z7.string().max(2e3).optional()
});
var adminRejectSellerSchema = z7.object({
  reason: z7.string().min(3).max(2e3)
});
var adminSuspendSellerSchema = z7.object({
  reason: z7.string().min(3).max(2e3)
});
var sellerIdParamSchema = z7.object({
  params: z7.object({
    id: z7.string().uuid("seller id must be a UUID")
  })
});
var shopSlugParamSchema = z7.object({
  params: z7.object({
    slug: z7.string().min(1).max(140).regex(/^[a-z0-9-]+$/, "Invalid shop slug")
  })
});

// src/modules/seller/seller.router.ts
var router8 = Router8();
router8.get("/shops", sellerController.listPublicShops);
router8.get("/shops/:slug", sellerController.getPublicShopBySlug);
router8.post(
  "/apply",
  checkAuth(Role.CUSTOMER, Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(applyAsSellerSchema),
  sellerController.applyAsSeller
);
router8.get("/me", checkAuth(Role.SELLER, Role.ADMIN), sellerController.getMySeller);
router8.patch(
  "/me",
  checkAuth(Role.SELLER, Role.ADMIN),
  validateRequest(updateMyShopSchema),
  sellerController.updateMyShop
);
router8.get(
  "/me/dashboard",
  checkAuth(Role.SELLER, Role.ADMIN),
  sellerController.getMyDashboard
);
router8.get(
  "/admin",
  checkAuth(Role.ADMIN, Role.STAFF),
  sellerController.adminListSellers
);
router8.get(
  "/admin/:id",
  checkAuth(Role.ADMIN, Role.STAFF),
  sellerController.adminGetSeller
);
router8.patch(
  "/admin/:id/approve",
  checkAuth(Role.ADMIN),
  validateRequest(adminApproveSellerSchema),
  sellerController.adminApproveSeller
);
router8.patch(
  "/admin/:id/reject",
  checkAuth(Role.ADMIN),
  validateRequest(adminRejectSellerSchema),
  sellerController.adminRejectSeller
);
router8.patch(
  "/admin/:id/suspend",
  checkAuth(Role.ADMIN),
  validateRequest(adminSuspendSellerSchema),
  sellerController.adminSuspendSeller
);
router8.patch(
  "/admin/:id/reinstate",
  checkAuth(Role.ADMIN),
  sellerController.adminReinstateSeller
);
var sellerRouter = router8;

// src/modules/cart/cart.router.ts
import { Router as Router9 } from "express";

// src/middleware/optionalAuth.ts
var optionalAuth = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : void 0;
    const cookieToken = CookieUtils.getCookie(req, "accessToken");
    const accessToken = bearerToken || cookieToken;
    let userId = null;
    if (accessToken) {
      const verified = jwtUtils.verifyToken(accessToken, envVars.ACCESS_TOKEN_SECRET);
      if (verified.success && verified.data?.userId) {
        userId = String(verified.data.userId);
      }
    }
    if (!userId) {
      const baSessionToken = CookieUtils.getCookie(req, "better-auth.session_token") || CookieUtils.getCookie(req, "__Secure-better-auth.session_token");
      if (baSessionToken || authHeader) {
        const cookieHeader = req.headers.cookie || [
          baSessionToken ? `better-auth.session_token=${baSessionToken}` : "",
          baSessionToken ? `__Secure-better-auth.session_token=${baSessionToken}` : ""
        ].filter(Boolean).join("; ");
        const session = await auth.api.getSession({
          headers: {
            ...cookieHeader ? { cookie: cookieHeader } : {},
            ...authHeader ? { authorization: authHeader } : {}
          }
        }).catch(() => null);
        if (session?.user?.id) userId = session.user.id;
      }
    }
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
      if (user && !user.isDeleted && user.status !== UserStatus.BLOCKED && user.status !== UserStatus.DELETED) {
        req.user = {
          userId: user.id,
          role: user.role,
          email: user.email
        };
      }
    }
  } catch {
  }
  next();
};

// src/modules/cart/cart.controler.ts
import status21 from "http-status";
import { randomUUID } from "crypto";

// src/modules/cart/cart.service.ts
import status20 from "http-status";

// src/modules/coupon/coupon.service.ts
import status19 from "http-status";
var normalizeCode = (code) => String(code ?? "").trim().toUpperCase();
var round22 = (n) => Math.round(n * 100) / 100;
var toNum = (v) => {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v.toString());
};
var toNumOrNull = (v) => {
  if (v == null) return null;
  return typeof v === "number" ? v : Number(v.toString());
};
var computeDiscount = (coupon, amount) => {
  if (!coupon.isActive || coupon.isDeleted) {
    throw new AppError_default(status19.BAD_REQUEST, "Coupon is not active");
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    throw new AppError_default(status19.BAD_REQUEST, "Coupon has expired");
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    throw new AppError_default(status19.BAD_REQUEST, "Coupon usage limit reached");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError_default(status19.BAD_REQUEST, "Amount must be a positive number");
  }
  const discountValue = toNum(coupon.discountValue);
  const maxDiscount = toNumOrNull(coupon.maxDiscount);
  const minAmount = toNumOrNull(coupon.minAmount);
  if (minAmount != null && amount < minAmount) {
    throw new AppError_default(
      status19.BAD_REQUEST,
      `Coupon requires a minimum amount of ${minAmount}`
    );
  }
  let discount = 0;
  if (coupon.discountType === CouponDiscountType.PERCENT) {
    discount = amount * discountValue / 100;
  } else {
    discount = discountValue;
  }
  if (maxDiscount != null) {
    discount = Math.min(discount, maxDiscount);
  }
  discount = Math.max(0, Math.min(discount, amount));
  const finalAmount = Math.max(0, amount - discount);
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue,
    originalAmount: round22(amount),
    discountAmount: round22(discount),
    finalAmount: round22(finalAmount)
  };
};
var findActiveCouponByCode = async (rawCode) => {
  const code = normalizeCode(rawCode);
  if (!code) {
    throw new AppError_default(status19.BAD_REQUEST, "Coupon code is required");
  }
  const coupon = await prisma.coupon.findFirst({
    where: { code, isDeleted: false }
  });
  if (!coupon) {
    throw new AppError_default(status19.NOT_FOUND, "Coupon not found");
  }
  return coupon;
};
var validateCoupon = async (rawCode, amount) => {
  const coupon = await findActiveCouponByCode(rawCode);
  return computeDiscount(coupon, amount);
};
var incrementUsage = async (rawCode) => {
  const code = normalizeCode(rawCode);
  if (!code) return;
  await prisma.coupon.updateMany({
    where: { code, isDeleted: false },
    data: { usedCount: { increment: 1 } }
  });
};
var decrementUsage = async (rawCode) => {
  const code = normalizeCode(rawCode);
  if (!code) return;
  await prisma.coupon.updateMany({
    where: { code, isDeleted: false, usedCount: { gt: 0 } },
    data: { usedCount: { decrement: 1 } }
  });
};
var createCoupon = async (payload) => {
  const code = normalizeCode(payload.code);
  if (!code) throw new AppError_default(status19.BAD_REQUEST, "Code is required");
  if (payload.discountType === CouponDiscountType.PERCENT && (payload.discountValue <= 0 || payload.discountValue > 100)) {
    throw new AppError_default(
      status19.BAD_REQUEST,
      "Percent discount must be between 1 and 100"
    );
  }
  if (payload.discountType === CouponDiscountType.FIXED && payload.discountValue <= 0) {
    throw new AppError_default(status19.BAD_REQUEST, "Fixed discount must be positive");
  }
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing && !existing.isDeleted) {
    throw new AppError_default(status19.CONFLICT, "Coupon code already exists");
  }
  const data = {
    code,
    description: payload.description ?? null,
    discountType: payload.discountType,
    discountValue: payload.discountValue,
    maxDiscount: payload.maxDiscount ?? null,
    minAmount: payload.minAmount ?? null,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
    maxUses: payload.maxUses ?? null,
    isActive: payload.isActive ?? true,
    isDeleted: false,
    deletedAt: null,
    usedCount: 0
  };
  if (existing) {
    return prisma.coupon.update({ where: { code }, data });
  }
  return prisma.coupon.create({ data });
};
var listCoupons = async (query2) => {
  const page = Math.max(1, Number(query2.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query2.limit) || 20));
  const skip = (page - 1) * limit;
  const where = { isDeleted: false };
  if (query2.isActive === "true") where.isActive = true;
  if (query2.isActive === "false") where.isActive = false;
  if (query2.search) {
    where.code = { contains: String(query2.search).toUpperCase() };
  }
  const [data, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.coupon.count({ where })
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};
var getCouponById = async (id) => {
  const coupon = await prisma.coupon.findFirst({
    where: { id, isDeleted: false }
  });
  if (!coupon) throw new AppError_default(status19.NOT_FOUND, "Coupon not found");
  return coupon;
};
var updateCoupon = async (id, payload) => {
  const existing = await getCouponById(id);
  if (payload.code) {
    const newCode = normalizeCode(payload.code);
    if (newCode !== existing.code) {
      const dup = await prisma.coupon.findUnique({ where: { code: newCode } });
      if (dup && dup.id !== existing.id && !dup.isDeleted) {
        throw new AppError_default(status19.CONFLICT, "Coupon code already exists");
      }
    }
  }
  const data = {};
  if (payload.code !== void 0) data.code = normalizeCode(payload.code);
  if (payload.description !== void 0) data.description = payload.description;
  if (payload.discountType !== void 0) data.discountType = payload.discountType;
  if (payload.discountValue !== void 0) data.discountValue = payload.discountValue;
  if (payload.maxDiscount !== void 0) data.maxDiscount = payload.maxDiscount;
  if (payload.minAmount !== void 0) data.minAmount = payload.minAmount;
  if (payload.expiresAt !== void 0)
    data.expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
  if (payload.maxUses !== void 0) data.maxUses = payload.maxUses;
  if (payload.isActive !== void 0) data.isActive = payload.isActive;
  return prisma.coupon.update({ where: { id }, data });
};
var deleteCoupon = async (id) => {
  await getCouponById(id);
  return prisma.coupon.update({
    where: { id },
    data: { isDeleted: true, deletedAt: /* @__PURE__ */ new Date(), isActive: false }
  });
};
var couponService = {
  computeDiscount,
  findActiveCouponByCode,
  validateCoupon,
  incrementUsage,
  decrementUsage,
  createCoupon,
  listCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon
};

// src/modules/cart/cart.service.ts
var cartInclude = {
  items: {
    include: {
      product: { include: { images: { orderBy: { sortOrder: "asc" } } } },
      variant: true
    }
  }
};
var summarize = async (cartId) => {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: cartInclude
  });
  if (!cart) throw new AppError_default(status20.NOT_FOUND, "Cart not found");
  const subtotal = cart.items.reduce(
    (sum, item) => sum + toNumber(item.unitPrice) * item.quantity,
    0
  );
  let discount = 0;
  let couponPreview = null;
  if (cart.couponCode && subtotal > 0) {
    try {
      couponPreview = await couponService.validateCoupon(cart.couponCode, subtotal);
      discount = couponPreview.discountAmount;
    } catch {
      couponPreview = null;
    }
  }
  return {
    cart,
    summary: {
      itemCount: cart.items.reduce((s, i) => s + i.quantity, 0),
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
      coupon: couponPreview
    }
  };
};
var findOrCreateCart = async ({
  userId,
  sessionToken,
  mergeFromSessionToken,
  onMerged
}) => {
  if (userId) {
    let cart = await prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE }
    });
    if (!cart) cart = await prisma.cart.create({ data: { userId } });
    if (mergeFromSessionToken && mergeFromSessionToken !== cart.sessionToken) {
      const guestCart = await prisma.cart.findUnique({
        where: { sessionToken: mergeFromSessionToken },
        include: { items: true }
      });
      if (guestCart && guestCart.userId == null && guestCart.id !== cart.id) {
        await prisma.$transaction(async (tx) => {
          for (const item of guestCart.items) {
            await tx.cartItem.upsert({
              where: {
                cartId_productId_variantId: {
                  cartId: cart.id,
                  productId: item.productId,
                  variantId: item.variantId ?? null
                }
              },
              create: {
                cartId: cart.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                unitPrice: item.unitPrice
              },
              update: { quantity: { increment: item.quantity } }
            });
          }
          await tx.cart.delete({ where: { id: guestCart.id } });
        });
        onMerged?.();
      } else if (guestCart && guestCart.userId == null && guestCart.id === cart.id) {
        onMerged?.();
      }
    }
    return cart;
  }
  if (sessionToken) {
    let cart = await prisma.cart.findUnique({ where: { sessionToken } });
    if (!cart) cart = await prisma.cart.create({ data: { sessionToken } });
    if (cart.userId) {
      cart = await prisma.cart.create({ data: { sessionToken: `${sessionToken}-${Date.now()}` } });
    }
    return cart;
  }
  throw new AppError_default(status20.BAD_REQUEST, "userId or sessionToken required");
};
var getCart = async (args) => {
  const cart = await findOrCreateCart(args);
  return summarize(cart.id);
};
var addItem = async (args, payload) => {
  const cart = await findOrCreateCart(args);
  const quantity = Math.max(1, payload.quantity ?? 1);
  const product = await prisma.product.findFirst({
    where: { id: payload.productId, isDeleted: false }
  });
  if (!product) throw new AppError_default(status20.NOT_FOUND, "Product not found");
  let unitPrice = toNumber(product.price);
  if (payload.variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: payload.variantId, productId: product.id, isActive: true }
    });
    if (!variant) throw new AppError_default(status20.NOT_FOUND, "Variant not found");
    unitPrice = toNumber(variant.price);
  }
  await prisma.cartItem.upsert({
    where: {
      cartId_productId_variantId: {
        cartId: cart.id,
        productId: payload.productId,
        variantId: payload.variantId ?? null
      }
    },
    create: {
      cartId: cart.id,
      productId: payload.productId,
      variantId: payload.variantId ?? null,
      quantity,
      unitPrice
    },
    update: { quantity: { increment: quantity }, unitPrice }
  });
  return summarize(cart.id);
};
var updateItem = async (args, itemId, payload) => {
  const cart = await findOrCreateCart(args);
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id }
  });
  if (!item) throw new AppError_default(status20.NOT_FOUND, "Cart item not found");
  if (payload.quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: payload.quantity }
    });
  }
  return summarize(cart.id);
};
var removeItem = async (args, itemId) => {
  const cart = await findOrCreateCart(args);
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  return summarize(cart.id);
};
var clearCart = async (args) => {
  const cart = await findOrCreateCart(args);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponCode: null }
  });
  return summarize(cart.id);
};
var applyCoupon = async (args, code) => {
  const cart = await findOrCreateCart(args);
  const summary6 = await summarize(cart.id);
  if (summary6.summary.subtotal <= 0) {
    throw new AppError_default(status20.BAD_REQUEST, "Cart is empty");
  }
  await couponService.validateCoupon(code, summary6.summary.subtotal);
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponCode: code.toUpperCase() }
  });
  return summarize(cart.id);
};
var removeCoupon = async (args) => {
  const cart = await findOrCreateCart(args);
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  return summarize(cart.id);
};
var cartService = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  findOrCreateCart,
  summarize
};

// src/modules/cart/cart.controler.ts
var GUEST_COOKIE = "nexora-cart";
var GUEST_COOKIE_MAX_AGE_MS = 1e3 * 60 * 60 * 24 * 30;
var isProd = () => envVars.NODE_ENV === "production";
var guestCookieOptions = () => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: isProd() ? "none" : "lax",
  path: "/",
  maxAge: GUEST_COOKIE_MAX_AGE_MS
});
var resolveCartArgs = (req, res) => {
  const userId = req.user?.userId;
  const guestToken = req.cookies?.[GUEST_COOKIE] || req.headers["x-cart-session"];
  if (userId) {
    return {
      userId,
      mergeFromSessionToken: guestToken,
      onMerged: () => res.clearCookie(GUEST_COOKIE, { ...guestCookieOptions(), maxAge: 0 })
    };
  }
  let token = guestToken;
  if (!token) {
    token = randomUUID();
    res.cookie(GUEST_COOKIE, token, guestCookieOptions());
  }
  return { sessionToken: token };
};
var get = catchAsync(async (req, res) => {
  const result = await cartService.getCart(resolveCartArgs(req, res));
  sendResponse(res, {
    httpStatusCode: status21.OK,
    success: true,
    message: "Cart fetched",
    data: result
  });
});
var addItem2 = catchAsync(async (req, res) => {
  const result = await cartService.addItem(resolveCartArgs(req, res), req.body);
  sendResponse(res, {
    httpStatusCode: status21.OK,
    success: true,
    message: "Item added to cart",
    data: result
  });
});
var updateItem2 = catchAsync(async (req, res) => {
  const result = await cartService.updateItem(
    resolveCartArgs(req, res),
    req.params.itemId,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status21.OK,
    success: true,
    message: "Cart item updated",
    data: result
  });
});
var removeItem2 = catchAsync(async (req, res) => {
  const result = await cartService.removeItem(
    resolveCartArgs(req, res),
    req.params.itemId
  );
  sendResponse(res, {
    httpStatusCode: status21.OK,
    success: true,
    message: "Cart item removed",
    data: result
  });
});
var clear = catchAsync(async (req, res) => {
  const result = await cartService.clearCart(resolveCartArgs(req, res));
  sendResponse(res, {
    httpStatusCode: status21.OK,
    success: true,
    message: "Cart cleared",
    data: result
  });
});
var applyCoupon2 = catchAsync(async (req, res) => {
  const result = await cartService.applyCoupon(
    resolveCartArgs(req, res),
    req.body.code
  );
  sendResponse(res, {
    httpStatusCode: status21.OK,
    success: true,
    message: "Coupon applied",
    data: result
  });
});
var removeCoupon2 = catchAsync(async (req, res) => {
  const result = await cartService.removeCoupon(resolveCartArgs(req, res));
  sendResponse(res, {
    httpStatusCode: status21.OK,
    success: true,
    message: "Coupon removed",
    data: result
  });
});
var cartController = {
  get,
  addItem: addItem2,
  updateItem: updateItem2,
  removeItem: removeItem2,
  clear,
  applyCoupon: applyCoupon2,
  removeCoupon: removeCoupon2
};

// src/modules/cart/cart.validation.ts
import { z as z8 } from "zod";
var addCartItemSchema = z8.object({
  productId: z8.string().uuid("productId must be a UUID"),
  variantId: z8.string().uuid("variantId must be a UUID").optional(),
  quantity: z8.number().int().min(1).max(999).optional()
});
var updateCartItemSchema = z8.object({
  quantity: z8.number().int().min(0).max(999)
});
var applyCouponSchema = z8.object({
  code: z8.string().min(1).max(60)
});

// src/modules/cart/cart.router.ts
var router9 = Router9();
router9.use(optionalAuth);
router9.get("/", cartController.get);
router9.post("/items", validateRequest(addCartItemSchema), cartController.addItem);
router9.patch(
  "/items/:itemId",
  validateRequest(updateCartItemSchema),
  cartController.updateItem
);
router9.delete("/items/:itemId", cartController.removeItem);
router9.post("/clear", cartController.clear);
router9.post("/coupon", validateRequest(applyCouponSchema), cartController.applyCoupon);
router9.delete("/coupon", cartController.removeCoupon);
var cartRouter = router9;

// src/modules/order/order.router.ts
import { Router as Router10 } from "express";

// src/modules/order/order.controler.ts
import status23 from "http-status";

// src/modules/order/order.service.ts
import status22 from "http-status";

// src/utilis/marketplacePricing.ts
var DEFAULT_COMMISSION_RATE = 10;
var DEFAULT_TAX_RATE = 0.08;
var FREE_SHIPPING_THRESHOLD = 50;
var STANDARD_SHIPPING = 5;
var EXPRESS_SHIPPING = 15;
var calculateSellerShipping = (subtotal, method = "standard") => {
  if (method === "express") return EXPRESS_SHIPPING;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
};
var calculateTax = (taxableAmount) => round2(taxableAmount * DEFAULT_TAX_RATE);
var allocateDiscount = (groupSubtotals, totalDiscount) => {
  if (totalDiscount <= 0 || groupSubtotals.length === 0) {
    return groupSubtotals.map(() => 0);
  }
  const grandTotal = groupSubtotals.reduce((s, x) => s + x, 0);
  if (grandTotal <= 0) {
    return groupSubtotals.map(() => 0);
  }
  const allocations = groupSubtotals.map(
    (sub) => round2(sub / grandTotal * totalDiscount)
  );
  const allocated = allocations.reduce((s, x) => s + x, 0);
  const drift = round2(totalDiscount - allocated);
  if (drift !== 0) {
    for (let i = allocations.length - 1; i >= 0; i--) {
      if (allocations[i] > 0 || drift > 0) {
        allocations[i] = round2(allocations[i] + drift);
        break;
      }
    }
  }
  return allocations;
};
var calculateCommission = (sellerSubtotalAfterDiscount, rateOverride) => {
  const rate = rateOverride != null && rateOverride >= 0 && rateOverride <= 100 ? rateOverride : DEFAULT_COMMISSION_RATE;
  const commissionAmount = round2(sellerSubtotalAfterDiscount * rate / 100);
  const payoutAmount = round2(sellerSubtotalAfterDiscount - commissionAmount);
  return { commissionRate: rate, commissionAmount, payoutAmount };
};

// src/modules/order/order.service.ts
var generateOrderNumber = () => {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const rand = Math.floor(1e5 + Math.random() * 9e5);
  return `NX-${year}-${rand}`;
};
var generateSellerOrderNumber = (parent, idx) => `${parent}-S${idx + 1}`;
var checkout = async (userId, payload) => {
  const cart = await prisma.cart.findFirst({
    where: { userId, status: CartStatus.ACTIVE },
    include: {
      items: {
        include: {
          product: { include: { seller: true } },
          variant: true
        }
      }
    }
  });
  if (!cart || cart.items.length === 0) {
    throw new AppError_default(status22.BAD_REQUEST, "Cart is empty");
  }
  const shippingAddress = await prisma.address.findFirst({
    where: { id: payload.shippingAddressId, userId, isDeleted: false }
  });
  if (!shippingAddress) {
    throw new AppError_default(status22.NOT_FOUND, "Shipping address not found");
  }
  let billingAddress = shippingAddress;
  if (payload.billingAddressId && payload.billingAddressId !== payload.shippingAddressId) {
    const found = await prisma.address.findFirst({
      where: { id: payload.billingAddressId, userId, isDeleted: false }
    });
    if (!found) throw new AppError_default(status22.NOT_FOUND, "Billing address not found");
    billingAddress = found;
  }
  const resolvedItems = [];
  for (const item of cart.items) {
    if (!item.product.seller) {
      throw new AppError_default(
        status22.BAD_REQUEST,
        `Product ${item.product.name} has no seller assigned`
      );
    }
    if (item.product.seller.status !== SellerStatus.APPROVED || item.product.seller.isDeleted) {
      throw new AppError_default(
        status22.BAD_REQUEST,
        `${item.product.name} is no longer available (seller unavailable)`
      );
    }
    const stockSource = item.variant ?? item.product;
    if (item.product.trackInventory && !item.product.allowBackorder && (stockSource.stock ?? 0) < item.quantity) {
      throw new AppError_default(
        status22.BAD_REQUEST,
        `Insufficient stock for ${item.product.name}`
      );
    }
    const unitPrice = toNumber(item.variant?.price ?? item.product.price);
    const lineSubtotal = round2(unitPrice * item.quantity);
    let image = item.variant?.image ?? null;
    if (!image) {
      const primary = await prisma.productImage.findFirst({
        where: { productId: item.productId, isPrimary: true }
      });
      image = primary?.url ?? null;
    }
    resolvedItems.push({
      productId: item.productId,
      variantId: item.variantId ?? null,
      sellerId: item.product.sellerId,
      sellerCommissionRate: item.product.seller.commissionRate ? toNumber(item.product.seller.commissionRate) : null,
      productName: item.product.name,
      variantName: item.variant?.name ?? null,
      sku: item.variant?.sku ?? item.product.sku,
      image,
      unitPrice,
      quantity: item.quantity,
      lineSubtotal
    });
  }
  const sellerGroups = /* @__PURE__ */ new Map();
  for (const it of resolvedItems) {
    const arr = sellerGroups.get(it.sellerId) ?? [];
    arr.push(it);
    sellerGroups.set(it.sellerId, arr);
  }
  const sellerIds = Array.from(sellerGroups.keys());
  const subtotal = round2(
    resolvedItems.reduce((s, i) => s + i.lineSubtotal, 0)
  );
  let totalDiscount = 0;
  const couponCode = payload.couponCode ?? cart.couponCode ?? null;
  if (couponCode) {
    const preview = await couponService.validateCoupon(couponCode, subtotal);
    totalDiscount = preview.discountAmount;
  }
  const shippingMethod = payload.shippingMethod ?? "standard";
  const groupSubtotals = sellerIds.map(
    (sid) => round2(
      sellerGroups.get(sid).reduce((s, it) => s + it.lineSubtotal, 0)
    )
  );
  const discountAllocations = allocateDiscount(groupSubtotals, totalDiscount);
  const sellerRollups = sellerIds.map((sid, idx) => {
    const items = sellerGroups.get(sid);
    const sellerSubtotal = groupSubtotals[idx];
    const discount = discountAllocations[idx];
    const shipping = calculateSellerShipping(sellerSubtotal, shippingMethod);
    const taxable = Math.max(0, sellerSubtotal - discount);
    const tax = calculateTax(taxable);
    const grandTotal2 = round2(taxable + shipping + tax);
    const commission = calculateCommission(
      taxable,
      items[0].sellerCommissionRate
    );
    return {
      sellerId: sid,
      items,
      subtotal: sellerSubtotal,
      discount,
      shipping,
      tax,
      grandTotal: grandTotal2,
      ...commission
    };
  });
  const shippingTotal = round2(
    sellerRollups.reduce((s, r) => s + r.shipping, 0)
  );
  const taxTotal = round2(sellerRollups.reduce((s, r) => s + r.tax, 0));
  const grandTotal = round2(
    sellerRollups.reduce((s, r) => s + r.grandTotal, 0)
  );
  const orderNumber = generateOrderNumber();
  const currency = cart.items[0]?.product.currency ?? "USD";
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: OrderStatus.PENDING_PAYMENT,
        fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
        paymentStatus: PaymentStatus.UNPAID,
        currency,
        subtotal,
        shippingTotal,
        taxTotal,
        discountTotal: totalDiscount,
        grandTotal,
        couponCode,
        couponDiscount: totalDiscount || null,
        shippingAddressId: shippingAddress.id,
        shippingSnapshot: shippingAddress,
        billingAddressId: billingAddress.id,
        billingSnapshot: billingAddress,
        customerNote: payload.customerNote
      }
    });
    for (let i = 0; i < sellerRollups.length; i++) {
      const r = sellerRollups[i];
      const sellerOrder = await tx.sellerOrder.create({
        data: {
          sellerOrderNumber: generateSellerOrderNumber(orderNumber, i),
          orderId: created.id,
          sellerId: r.sellerId,
          status: SellerOrderStatus.PENDING,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          currency,
          subtotal: r.subtotal,
          shippingTotal: r.shipping,
          taxTotal: r.tax,
          discountTotal: r.discount,
          grandTotal: r.grandTotal,
          commissionRate: r.commissionRate,
          commissionAmount: r.commissionAmount,
          payoutAmount: r.payoutAmount,
          customerNote: payload.customerNote
        }
      });
      await tx.sellerOrderStatusHistory.create({
        data: {
          sellerOrderId: sellerOrder.id,
          toStatus: SellerOrderStatus.PENDING,
          note: "Sub-order created"
        }
      });
      for (const it of r.items) {
        const itemShare = r.subtotal > 0 ? it.lineSubtotal / r.subtotal : 0;
        const lineDiscount = round2(r.discount * itemShare);
        const lineTotal = round2(it.lineSubtotal - lineDiscount);
        await tx.orderItem.create({
          data: {
            orderId: created.id,
            sellerOrderId: sellerOrder.id,
            sellerId: r.sellerId,
            productId: it.productId,
            variantId: it.variantId,
            productName: it.productName,
            variantName: it.variantName,
            sku: it.sku,
            image: it.image,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            lineSubtotal: it.lineSubtotal,
            lineDiscount,
            lineTotal
          }
        });
      }
    }
    for (const item of resolvedItems) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } }
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }
    }
    await tx.cart.update({
      where: { id: cart.id },
      data: { status: CartStatus.CONVERTED, orderId: created.id }
    });
    await tx.orderStatusHistory.create({
      data: { orderId: created.id, toStatus: OrderStatus.PENDING_PAYMENT }
    });
    return created;
  });
  if (couponCode) {
    await couponService.incrementUsage(couponCode);
  }
  await notificationService.createNotification({
    userId,
    type: NotificationType.ORDER_PLACED,
    title: "Order placed",
    message: `Your order ${order.orderNumber} has been placed across ${sellerRollups.length} shop(s).`,
    actionUrl: `/orders/${order.id}`,
    metadata: { orderId: order.id, orderNumber: order.orderNumber }
  }).catch(() => null);
  for (const r of sellerRollups) {
    const sellerRow = await prisma.seller.findUnique({
      where: { id: r.sellerId },
      select: { userId: true, shopName: true }
    });
    if (!sellerRow) continue;
    await notificationService.createNotification({
      userId: sellerRow.userId,
      type: NotificationType.NEW_SELLER_ORDER,
      title: "New order received",
      message: `${sellerRow.shopName}: a new order worth ${currency} ${r.grandTotal.toFixed(
        2
      )} is awaiting payment confirmation.`,
      actionUrl: `/seller/orders`,
      metadata: { orderId: order.id, sellerId: r.sellerId }
    }).catch(() => null);
  }
  await checkLowStockAndNotify(
    Array.from(new Set(resolvedItems.map((i) => i.productId))),
    Array.from(
      new Set(
        resolvedItems.map((i) => i.variantId).filter((v) => v !== null)
      )
    )
  ).catch(() => null);
  return order;
};
var checkLowStockAndNotify = async (productIds, variantIds) => {
  if (productIds.length === 0) return;
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, trackInventory: true, isDeleted: false },
    select: {
      id: true,
      name: true,
      stock: true,
      lowStockAlert: true,
      seller: { select: { userId: true, shopName: true } }
    }
  });
  for (const p of products) {
    if (!p.seller) continue;
    if (p.stock <= p.lowStockAlert) {
      await notificationService.createNotification({
        userId: p.seller.userId,
        type: NotificationType.LOW_STOCK,
        title: "Low stock alert",
        message: `${p.name} is running low (${p.stock} left).`,
        actionUrl: `/seller/products/${p.id}`,
        metadata: { productId: p.id, stock: p.stock }
      }).catch(() => null);
    }
  }
  if (variantIds.length === 0) return;
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      name: true,
      stock: true,
      product: {
        select: {
          id: true,
          name: true,
          lowStockAlert: true,
          seller: { select: { userId: true, shopName: true } }
        }
      }
    }
  });
  for (const v of variants) {
    if (!v.product?.seller) continue;
    if (v.stock <= v.product.lowStockAlert) {
      await notificationService.createNotification({
        userId: v.product.seller.userId,
        type: NotificationType.LOW_STOCK,
        title: "Low stock alert",
        message: `${v.product.name} (${v.name}) is running low (${v.stock} left).`,
        actionUrl: `/seller/products/${v.product.id}`,
        metadata: { productId: v.product.id, variantId: v.id, stock: v.stock }
      }).catch(() => null);
    }
  }
};
var listForUser = async (userId, query2) => {
  const page = Math.max(1, Number(query2.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query2.limit) || 10));
  const skip = (page - 1) * limit;
  const where = { userId };
  if (query2.status) where.status = query2.status;
  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip,
      take: limit,
      include: {
        items: true,
        sellerOrders: {
          include: {
            seller: { select: { shopName: true, shopSlug: true, logo: true } }
          }
        }
      }
    }),
    prisma.order.count({ where })
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};
var listAll = async (query2) => {
  const page = Math.max(1, Number(query2.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query2.limit) || 20));
  const skip = (page - 1) * limit;
  const where = {};
  if (query2.status) where.status = query2.status;
  if (query2.paymentStatus) where.paymentStatus = query2.paymentStatus;
  if (query2.search) where.orderNumber = { contains: query2.search.toUpperCase() };
  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip,
      take: limit,
      include: {
        items: true,
        user: { select: { id: true, email: true, name: true } },
        sellerOrders: {
          include: {
            seller: { select: { shopName: true, shopSlug: true } }
          }
        }
      }
    }),
    prisma.order.count({ where })
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};
var getById2 = async (id, userId) => {
  const where = { id };
  if (userId) where.userId = userId;
  const order = await prisma.order.findFirst({
    where,
    include: {
      items: true,
      payments: true,
      history: { orderBy: { createdAt: "asc" } },
      shippingAddress: true,
      billingAddress: true,
      sellerOrders: {
        include: {
          seller: {
            select: { id: true, shopName: true, shopSlug: true, logo: true }
          },
          items: true,
          history: { orderBy: { createdAt: "asc" } }
        }
      }
    }
  });
  if (!order) throw new AppError_default(status22.NOT_FOUND, "Order not found");
  return order;
};
var updateStatus = async (orderId, toStatus, changedBy, note) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError_default(status22.NOT_FOUND, "Order not found");
  const data = { status: toStatus };
  if (toStatus === OrderStatus.SHIPPED) data.shippedAt = /* @__PURE__ */ new Date();
  if (toStatus === OrderStatus.DELIVERED) {
    data.deliveredAt = /* @__PURE__ */ new Date();
    data.fulfillmentStatus = FulfillmentStatus.FULFILLED;
  }
  if (toStatus === OrderStatus.CANCELLED) data.cancelledAt = /* @__PURE__ */ new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.order.update({ where: { id: orderId }, data });
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus,
        changedBy: changedBy ?? null,
        note
      }
    });
    return u;
  });
  const statusToType = {
    [OrderStatus.PAID]: NotificationType.ORDER_PAID,
    [OrderStatus.SHIPPED]: NotificationType.ORDER_SHIPPED,
    [OrderStatus.DELIVERED]: NotificationType.ORDER_DELIVERED,
    [OrderStatus.CANCELLED]: NotificationType.ORDER_CANCELLED
  };
  const notifType = statusToType[toStatus] ?? NotificationType.SYSTEM;
  await notificationService.createNotification({
    userId: updated.userId,
    type: notifType,
    title: `Order ${updated.orderNumber} ${toStatus.replace(/_/g, " ").toLowerCase()}`,
    message: `Your order status is now: ${toStatus}`,
    actionUrl: `/orders/${updated.id}`,
    metadata: { orderId: updated.id, status: toStatus }
  }).catch(() => null);
  return updated;
};
var cancel = async (orderId, userId, reason) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { sellerOrders: true }
  });
  if (!order) throw new AppError_default(status22.NOT_FOUND, "Order not found");
  const anyShipped = order.sellerOrders.some(
    (so) => so.status === SellerOrderStatus.SHIPPED || so.status === SellerOrderStatus.OUT_FOR_DELIVERY || so.status === SellerOrderStatus.DELIVERED
  );
  if (anyShipped) {
    throw new AppError_default(
      status22.BAD_REQUEST,
      "Cannot cancel \u2014 at least one shop has already shipped"
    );
  }
  await prisma.$transaction(async (tx) => {
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } }
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        });
      }
    }
    for (const so of order.sellerOrders) {
      await tx.sellerOrder.update({
        where: { id: so.id },
        data: {
          status: SellerOrderStatus.CANCELLED,
          cancelledAt: /* @__PURE__ */ new Date(),
          cancelReason: reason ?? "Cancelled by customer"
        }
      });
      await tx.sellerOrderStatusHistory.create({
        data: {
          sellerOrderId: so.id,
          fromStatus: so.status,
          toStatus: SellerOrderStatus.CANCELLED,
          changedBy: userId,
          note: reason ?? "Customer cancellation"
        }
      });
    }
  });
  if (order.couponCode) {
    await couponService.decrementUsage(order.couponCode);
  }
  return updateStatus(orderId, OrderStatus.CANCELLED, userId, reason);
};
var orderService = {
  checkout,
  listForUser,
  listAll,
  getById: getById2,
  updateStatus,
  cancel
};

// src/modules/order/order.controler.ts
var checkout2 = catchAsync(async (req, res) => {
  const result = await orderService.checkout(req.user.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status23.CREATED,
    success: true,
    message: "Order placed",
    data: result
  });
});
var listMine = catchAsync(async (req, res) => {
  const result = await orderService.listForUser(req.user.userId, req.query);
  sendResponse(res, {
    httpStatusCode: status23.OK,
    success: true,
    message: "Orders fetched",
    data: result.data,
    meta: result.meta
  });
});
var listAll2 = catchAsync(async (req, res) => {
  const result = await orderService.listAll(req.query);
  sendResponse(res, {
    httpStatusCode: status23.OK,
    success: true,
    message: "Orders fetched",
    data: result.data,
    meta: result.meta
  });
});
var getById3 = catchAsync(async (req, res) => {
  const isStaff = req.user.role === "ADMIN" || req.user.role === "STAFF";
  const result = await orderService.getById(
    req.params.id,
    isStaff ? void 0 : req.user.userId
  );
  sendResponse(res, {
    httpStatusCode: status23.OK,
    success: true,
    message: "Order fetched",
    data: result
  });
});
var updateStatus2 = catchAsync(async (req, res) => {
  const result = await orderService.updateStatus(
    req.params.id,
    req.body.status,
    req.user.userId,
    req.body.note
  );
  sendResponse(res, {
    httpStatusCode: status23.OK,
    success: true,
    message: "Order status updated",
    data: result
  });
});
var cancel2 = catchAsync(async (req, res) => {
  const result = await orderService.cancel(
    req.params.id,
    req.user.userId,
    req.body?.reason
  );
  sendResponse(res, {
    httpStatusCode: status23.OK,
    success: true,
    message: "Order cancelled",
    data: result
  });
});
var orderController = {
  checkout: checkout2,
  listMine,
  listAll: listAll2,
  getById: getById3,
  updateStatus: updateStatus2,
  cancel: cancel2
};

// src/modules/order/order.validation.ts
import { z as z9 } from "zod";
var checkoutSchema = z9.object({
  shippingAddressId: z9.string().uuid("shippingAddressId must be a UUID"),
  billingAddressId: z9.string().uuid("billingAddressId must be a UUID").optional(),
  couponCode: z9.string().min(1).max(60).optional(),
  customerNote: z9.string().max(2e3).optional(),
  shippingMethod: z9.enum(["standard", "express"]).optional()
});
var updateOrderStatusSchema = z9.object({
  status: z9.enum([
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
    "RETURN_REQUESTED",
    "RETURNED",
    "FAILED"
  ]),
  note: z9.string().max(1e3).optional()
});

// src/modules/order/order.router.ts
var router10 = Router10();
router10.use(checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF));
router10.post(
  "/checkout",
  checkoutLimiter,
  validateRequest(checkoutSchema),
  orderController.checkout
);
router10.get("/me", orderController.listMine);
router10.post("/:id/cancel", orderController.cancel);
router10.get("/:id", orderController.getById);
router10.get("/", checkAuth(Role.ADMIN, Role.STAFF), orderController.listAll);
router10.patch(
  "/:id/status",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(updateOrderStatusSchema),
  orderController.updateStatus
);
var orderRouter = router10;

// src/modules/sellerOrder/sellerOrder.router.ts
import { Router as Router11 } from "express";

// src/modules/sellerOrder/sellerOrder.controler.ts
import status25 from "http-status";

// src/modules/sellerOrder/sellerOrder.service.ts
import status24 from "http-status";
var ALLOWED_NEXT = {
  [SellerOrderStatus.PENDING]: [
    SellerOrderStatus.CONFIRMED,
    SellerOrderStatus.CANCELLED
  ],
  [SellerOrderStatus.CONFIRMED]: [
    SellerOrderStatus.PROCESSING,
    SellerOrderStatus.CANCELLED
  ],
  [SellerOrderStatus.PROCESSING]: [
    SellerOrderStatus.PACKED,
    SellerOrderStatus.CANCELLED
  ],
  [SellerOrderStatus.PACKED]: [
    SellerOrderStatus.SHIPPED,
    SellerOrderStatus.CANCELLED
  ],
  [SellerOrderStatus.SHIPPED]: [
    SellerOrderStatus.OUT_FOR_DELIVERY,
    SellerOrderStatus.DELIVERED
  ],
  [SellerOrderStatus.OUT_FOR_DELIVERY]: [SellerOrderStatus.DELIVERED],
  [SellerOrderStatus.DELIVERED]: [
    SellerOrderStatus.RETURN_REQUESTED,
    SellerOrderStatus.REFUNDED
  ],
  [SellerOrderStatus.RETURN_REQUESTED]: [
    SellerOrderStatus.RETURNED,
    SellerOrderStatus.DELIVERED
  ],
  [SellerOrderStatus.RETURNED]: [SellerOrderStatus.REFUNDED],
  [SellerOrderStatus.CANCELLED]: [],
  [SellerOrderStatus.REFUNDED]: []
};
var assertTransitionAllowed = (from, to) => {
  if (from === to) return;
  const allowed = ALLOWED_NEXT[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError_default(
      status24.BAD_REQUEST,
      `Invalid status transition: ${from} -> ${to}`
    );
  }
};
var resolveActorSellerId2 = async (userId) => {
  const seller = await prisma.seller.findUnique({
    where: { userId },
    select: { id: true, isDeleted: true }
  });
  if (!seller || seller.isDeleted) {
    throw new AppError_default(status24.FORBIDDEN, "You are not a seller");
  }
  return seller.id;
};
var reconcileParentOrder = async (tx, orderId) => {
  const subs = await tx.sellerOrder.findMany({
    where: { orderId },
    select: { status: true }
  });
  if (subs.length === 0) return;
  const allDelivered = subs.every(
    (s) => s.status === SellerOrderStatus.DELIVERED
  );
  const allCancelled = subs.every(
    (s) => s.status === SellerOrderStatus.CANCELLED
  );
  const anyDelivered = subs.some(
    (s) => s.status === SellerOrderStatus.DELIVERED
  );
  const anyShipped = subs.some(
    (s) => s.status === SellerOrderStatus.SHIPPED || s.status === SellerOrderStatus.OUT_FOR_DELIVERY || s.status === SellerOrderStatus.DELIVERED
  );
  const data = {};
  if (allDelivered) {
    data.status = OrderStatus.DELIVERED;
    data.fulfillmentStatus = FulfillmentStatus.FULFILLED;
    data.deliveredAt = /* @__PURE__ */ new Date();
  } else if (allCancelled) {
    data.status = OrderStatus.CANCELLED;
    data.cancelledAt = /* @__PURE__ */ new Date();
  } else if (anyShipped) {
    data.status = OrderStatus.SHIPPED;
    data.fulfillmentStatus = anyDelivered ? FulfillmentStatus.PARTIAL : FulfillmentStatus.UNFULFILLED;
  } else {
    data.fulfillmentStatus = FulfillmentStatus.UNFULFILLED;
  }
  if (Object.keys(data).length > 0) {
    await tx.order.update({ where: { id: orderId }, data });
  }
};
var listMine2 = async (userId, query2) => {
  const sellerId = await resolveActorSellerId2(userId);
  const qb = new QueryBuilder(prisma.sellerOrder, query2, {
    searchableFields: ["sellerOrderNumber", "trackingNumber"],
    filterableFields: ["status", "fulfillmentStatus"]
  });
  qb.search().filter().sort().paginate();
  const built = qb.getQuery();
  built.where = { ...built.where ?? {}, sellerId };
  built.orderBy = { createdAt: "desc" };
  built.include = {
    order: {
      select: {
        id: true,
        orderNumber: true,
        user: { select: { id: true, name: true, email: true } }
      }
    },
    items: true
  };
  const [data, total] = await Promise.all([
    prisma.sellerOrder.findMany(built),
    prisma.sellerOrder.count({ where: built.where })
  ]);
  const limit = Number(query2.limit) || 10;
  return {
    data,
    meta: {
      page: Number(query2.page) || 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
var listAll3 = async (query2) => {
  const qb = new QueryBuilder(prisma.sellerOrder, query2, {
    searchableFields: ["sellerOrderNumber", "trackingNumber"],
    filterableFields: ["status", "fulfillmentStatus", "sellerId", "orderId"]
  });
  qb.search().filter().sort().paginate();
  const built = qb.getQuery();
  built.orderBy = { createdAt: "desc" };
  built.include = {
    order: {
      select: {
        id: true,
        orderNumber: true,
        user: { select: { id: true, name: true, email: true } }
      }
    },
    seller: { select: { id: true, shopName: true, shopSlug: true } },
    items: true
  };
  const [data, total] = await Promise.all([
    prisma.sellerOrder.findMany(built),
    prisma.sellerOrder.count({ where: built.where })
  ]);
  const limit = Number(query2.limit) || 10;
  return {
    data,
    meta: {
      page: Number(query2.page) || 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
var getById4 = async (id, actor) => {
  const so = await prisma.sellerOrder.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          shippingAddress: true,
          billingAddress: true,
          user: { select: { id: true, name: true, email: true } }
        }
      },
      seller: true,
      items: true,
      history: { orderBy: { createdAt: "asc" } }
    }
  });
  if (!so) throw new AppError_default(status24.NOT_FOUND, "Sub-order not found");
  if (actor.role === Role.SELLER) {
    const sellerId = await resolveActorSellerId2(actor.userId);
    if (so.sellerId !== sellerId) {
      throw new AppError_default(status24.FORBIDDEN, "Not your sub-order");
    }
  }
  return so;
};
var ensureActorOwns = async (so, actor) => {
  if (actor.role === Role.ADMIN || actor.role === Role.STAFF) return;
  if (actor.role === Role.SELLER) {
    const sellerId = await resolveActorSellerId2(actor.userId);
    if (so.sellerId !== sellerId) {
      throw new AppError_default(status24.FORBIDDEN, "Not your sub-order");
    }
    return;
  }
  throw new AppError_default(status24.FORBIDDEN, "Insufficient role");
};
var updateStatus3 = async (id, toStatus, actor, note) => {
  const so = await prisma.sellerOrder.findUnique({
    where: { id },
    include: {
      order: { select: { id: true, orderNumber: true, userId: true } },
      seller: { select: { shopName: true, userId: true } }
    }
  });
  if (!so) throw new AppError_default(status24.NOT_FOUND, "Sub-order not found");
  await ensureActorOwns(so, actor);
  assertTransitionAllowed(so.status, toStatus);
  const data = { status: toStatus };
  if (toStatus === SellerOrderStatus.SHIPPED) data.shippedAt = /* @__PURE__ */ new Date();
  if (toStatus === SellerOrderStatus.DELIVERED) {
    data.deliveredAt = /* @__PURE__ */ new Date();
    data.fulfillmentStatus = FulfillmentStatus.FULFILLED;
  }
  if (toStatus === SellerOrderStatus.CANCELLED) {
    data.cancelledAt = /* @__PURE__ */ new Date();
    data.cancelReason = note ?? "Cancelled";
  }
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.sellerOrder.update({ where: { id }, data });
    await tx.sellerOrderStatusHistory.create({
      data: {
        sellerOrderId: id,
        fromStatus: so.status,
        toStatus,
        changedBy: actor.userId,
        note
      }
    });
    if (toStatus === SellerOrderStatus.CANCELLED) {
      const items = await tx.orderItem.findMany({
        where: { sellerOrderId: id }
      });
      for (const it of items) {
        if (it.variantId) {
          await tx.productVariant.update({
            where: { id: it.variantId },
            data: { stock: { increment: it.quantity } }
          });
        } else {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { increment: it.quantity } }
          });
        }
      }
    }
    if (toStatus === SellerOrderStatus.DELIVERED) {
      const existingItem = await tx.sellerPayoutItem.findUnique({
        where: { sellerOrderId: id }
      });
      if (!existingItem) {
        await tx.sellerPayoutItem.create({
          data: {
            sellerOrderId: id,
            grossAmount: u.subtotal,
            commissionAmount: u.commissionAmount,
            refundAmount: 0,
            netAmount: u.payoutAmount
          }
        });
      }
      await tx.seller.update({
        where: { id: so.sellerId },
        data: {
          orderCount: { increment: 1 },
          totalSales: { increment: toNumber(u.payoutAmount) }
        }
      });
    }
    await reconcileParentOrder(tx, so.order.id);
    return u;
  });
  const customerType = {
    [SellerOrderStatus.SHIPPED]: NotificationType.ORDER_SHIPPED,
    [SellerOrderStatus.DELIVERED]: NotificationType.ORDER_DELIVERED,
    [SellerOrderStatus.CANCELLED]: NotificationType.SELLER_ORDER_CANCELLED
  };
  const notifType = customerType[toStatus] ?? NotificationType.SYSTEM;
  await notificationService.createNotification({
    userId: so.order.userId,
    type: notifType,
    title: `${so.seller.shopName} \u2014 ${toStatus.replace(/_/g, " ").toLowerCase()}`,
    message: `Sub-order ${so.sellerOrderNumber} is now ${toStatus}.`,
    actionUrl: `/orders/${so.order.id}`,
    metadata: {
      orderId: so.order.id,
      sellerOrderId: id,
      status: toStatus
    }
  }).catch(() => null);
  return updated;
};
var addTracking = async (id, payload, actor) => {
  const so = await prisma.sellerOrder.findUnique({ where: { id } });
  if (!so) throw new AppError_default(status24.NOT_FOUND, "Sub-order not found");
  await ensureActorOwns(so, actor);
  return prisma.sellerOrder.update({
    where: { id },
    data: {
      courier: payload.courier,
      trackingNumber: payload.trackingNumber,
      trackingUrl: payload.trackingUrl
    }
  });
};
var cancel3 = async (id, reason, actor) => updateStatus3(id, SellerOrderStatus.CANCELLED, actor, reason);
var sellerOrderService = {
  listMine: listMine2,
  listAll: listAll3,
  getById: getById4,
  updateStatus: updateStatus3,
  addTracking,
  cancel: cancel3,
  reconcileParentOrder
};

// src/modules/sellerOrder/sellerOrder.controler.ts
var listMine3 = catchAsync(async (req, res) => {
  const result = await sellerOrderService.listMine(
    req.user.userId,
    req.query
  );
  sendResponse(res, {
    httpStatusCode: status25.OK,
    success: true,
    message: "Seller orders fetched",
    data: result.data,
    meta: result.meta
  });
});
var listAll4 = catchAsync(async (req, res) => {
  const result = await sellerOrderService.listAll(
    req.query
  );
  sendResponse(res, {
    httpStatusCode: status25.OK,
    success: true,
    message: "Seller orders fetched",
    data: result.data,
    meta: result.meta
  });
});
var getById5 = catchAsync(async (req, res) => {
  const result = await sellerOrderService.getById(req.params.id, {
    userId: req.user.userId,
    role: req.user.role
  });
  sendResponse(res, {
    httpStatusCode: status25.OK,
    success: true,
    message: "Seller order fetched",
    data: result
  });
});
var updateStatus4 = catchAsync(async (req, res) => {
  const result = await sellerOrderService.updateStatus(
    req.params.id,
    req.body.status,
    { userId: req.user.userId, role: req.user.role },
    req.body.note
  );
  sendResponse(res, {
    httpStatusCode: status25.OK,
    success: true,
    message: "Status updated",
    data: result
  });
});
var addTracking2 = catchAsync(async (req, res) => {
  const result = await sellerOrderService.addTracking(
    req.params.id,
    req.body,
    { userId: req.user.userId, role: req.user.role }
  );
  sendResponse(res, {
    httpStatusCode: status25.OK,
    success: true,
    message: "Tracking added",
    data: result
  });
});
var cancel4 = catchAsync(async (req, res) => {
  const result = await sellerOrderService.cancel(
    req.params.id,
    req.body.reason,
    { userId: req.user.userId, role: req.user.role }
  );
  sendResponse(res, {
    httpStatusCode: status25.OK,
    success: true,
    message: "Sub-order cancelled",
    data: result
  });
});
var sellerOrderController = {
  listMine: listMine3,
  listAll: listAll4,
  getById: getById5,
  updateStatus: updateStatus4,
  addTracking: addTracking2,
  cancel: cancel4
};

// src/modules/sellerOrder/sellerOrder.validation.ts
import { z as z10 } from "zod";
var updateSellerOrderStatusSchema = z10.object({
  status: z10.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
    "RETURN_REQUESTED",
    "RETURNED"
  ]),
  note: z10.string().max(1e3).optional()
});
var addTrackingSchema = z10.object({
  courier: z10.string().min(1).max(100),
  trackingNumber: z10.string().min(1).max(100),
  trackingUrl: z10.string().url().max(500).optional()
});
var cancelSellerOrderSchema = z10.object({
  reason: z10.string().min(1).max(500)
});

// src/modules/sellerOrder/sellerOrder.router.ts
var router11 = Router11();
router11.get(
  "/me",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  sellerOrderController.listMine
);
router11.get(
  "/admin",
  checkAuth(Role.ADMIN, Role.STAFF),
  sellerOrderController.listAll
);
router11.get(
  "/:id",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  sellerOrderController.getById
);
router11.patch(
  "/:id/status",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(updateSellerOrderStatusSchema),
  sellerOrderController.updateStatus
);
router11.patch(
  "/:id/tracking",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(addTrackingSchema),
  sellerOrderController.addTracking
);
router11.patch(
  "/:id/cancel",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(cancelSellerOrderSchema),
  sellerOrderController.cancel
);
var sellerOrderRouter = router11;

// src/modules/payout/payout.router.ts
import { Router as Router12 } from "express";

// src/modules/payout/payout.controler.ts
import status27 from "http-status";

// src/modules/payout/payout.service.ts
import status26 from "http-status";
var generatePayout = async (payload) => {
  const seller = await prisma.seller.findUnique({
    where: { id: payload.sellerId }
  });
  if (!seller) throw new AppError_default(status26.NOT_FOUND, "Seller not found");
  const periodStart = payload.periodStart ?? /* @__PURE__ */ new Date(0);
  const periodEnd = payload.periodEnd ?? /* @__PURE__ */ new Date();
  const items = await prisma.sellerPayoutItem.findMany({
    where: {
      payoutId: null,
      sellerOrder: {
        sellerId: payload.sellerId,
        deliveredAt: { gte: periodStart, lte: periodEnd }
      }
    },
    include: { sellerOrder: { select: { currency: true } } }
  });
  if (items.length === 0) {
    throw new AppError_default(
      status26.BAD_REQUEST,
      "No unpaid delivered orders for this period"
    );
  }
  const grossAmount = round2(
    items.reduce((s, i) => s + toNumber(i.grossAmount), 0)
  );
  const commissionAmount = round2(
    items.reduce((s, i) => s + toNumber(i.commissionAmount), 0)
  );
  const refundAmount = round2(
    items.reduce((s, i) => s + toNumber(i.refundAmount), 0)
  );
  const netAmount = round2(
    items.reduce((s, i) => s + toNumber(i.netAmount), 0)
  );
  const method = payload.method ?? seller.payoutMethod ?? PayoutMethod.MANUAL_BANK;
  const currency = items[0]?.sellerOrder?.currency ?? "USD";
  const payout = await prisma.$transaction(async (tx) => {
    const created = await tx.sellerPayout.create({
      data: {
        sellerId: payload.sellerId,
        periodStart,
        periodEnd,
        currency,
        grossAmount,
        commissionAmount,
        refundAmount,
        adjustmentAmount: 0,
        netAmount,
        method,
        status: PayoutStatus.PENDING
      }
    });
    await tx.sellerPayoutItem.updateMany({
      where: { id: { in: items.map((i) => i.id) } },
      data: { payoutId: created.id }
    });
    return created;
  });
  await notificationService.createNotification({
    userId: seller.userId,
    type: NotificationType.PAYOUT_INITIATED,
    title: "Payout initiated",
    message: `Payout of ${currency} ${netAmount.toFixed(2)} initiated for ${items.length} orders.`,
    actionUrl: "/seller/payouts",
    metadata: { payoutId: payout.id }
  }).catch(() => null);
  return payout;
};
var markPaid = async (id, payload) => {
  const payout = await prisma.sellerPayout.findUnique({
    where: { id },
    include: { seller: { select: { userId: true } } }
  });
  if (!payout) throw new AppError_default(status26.NOT_FOUND, "Payout not found");
  if (payout.status === PayoutStatus.PAID) {
    throw new AppError_default(status26.BAD_REQUEST, "Payout already paid");
  }
  const updated = await prisma.sellerPayout.update({
    where: { id },
    data: {
      status: PayoutStatus.PAID,
      paidAt: /* @__PURE__ */ new Date(),
      bankReference: payload.bankReference,
      stripeTransferId: payload.stripeTransferId
    }
  });
  await notificationService.createNotification({
    userId: payout.seller.userId,
    type: NotificationType.PAYOUT_PAID,
    title: "Payout paid",
    message: `Your payout of ${payout.currency} ${toNumber(
      payout.netAmount
    ).toFixed(2)} has been disbursed.`,
    actionUrl: "/seller/payouts",
    metadata: { payoutId: id }
  }).catch(() => null);
  return updated;
};
var markFailed = async (id, failureReason) => {
  const payout = await prisma.sellerPayout.findUnique({
    where: { id },
    include: { seller: { select: { userId: true } } }
  });
  if (!payout) throw new AppError_default(status26.NOT_FOUND, "Payout not found");
  const updated = await prisma.sellerPayout.update({
    where: { id },
    data: { status: PayoutStatus.FAILED, failureReason }
  });
  await notificationService.createNotification({
    userId: payout.seller.userId,
    type: NotificationType.PAYOUT_FAILED,
    title: "Payout failed",
    message: `Your payout failed: ${failureReason}`,
    actionUrl: "/seller/payouts",
    metadata: { payoutId: id }
  }).catch(() => null);
  return updated;
};
var listMine4 = async (userId, query2) => {
  const seller = await prisma.seller.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (!seller) throw new AppError_default(status26.FORBIDDEN, "Not a seller");
  const qb = new QueryBuilder(prisma.sellerPayout, query2, {
    searchableFields: ["bankReference", "stripeTransferId"],
    filterableFields: ["status", "method"]
  });
  qb.search().filter().sort().paginate();
  const built = qb.getQuery();
  built.where = { ...built.where ?? {}, sellerId: seller.id };
  built.orderBy = { createdAt: "desc" };
  built.include = { items: true };
  const [data, total] = await Promise.all([
    prisma.sellerPayout.findMany(built),
    prisma.sellerPayout.count({ where: built.where })
  ]);
  const limit = Number(query2.limit) || 10;
  return {
    data,
    meta: {
      page: Number(query2.page) || 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
var listAll5 = async (query2) => {
  const qb = new QueryBuilder(prisma.sellerPayout, query2, {
    searchableFields: ["bankReference", "stripeTransferId"],
    filterableFields: ["status", "method", "sellerId"]
  });
  qb.search().filter().sort().paginate();
  const built = qb.getQuery();
  built.orderBy = { createdAt: "desc" };
  built.include = {
    seller: { select: { id: true, shopName: true, shopSlug: true } },
    items: true
  };
  const [data, total] = await Promise.all([
    prisma.sellerPayout.findMany(built),
    prisma.sellerPayout.count({ where: built.where })
  ]);
  const limit = Number(query2.limit) || 10;
  return {
    data,
    meta: {
      page: Number(query2.page) || 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
var getById6 = async (id, actor) => {
  const payout = await prisma.sellerPayout.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, shopName: true, userId: true } },
      items: { include: { sellerOrder: true } }
    }
  });
  if (!payout) throw new AppError_default(status26.NOT_FOUND, "Payout not found");
  if (actor.role === Role.SELLER && payout.seller.userId !== actor.userId) {
    throw new AppError_default(status26.FORBIDDEN, "Not your payout");
  }
  return payout;
};
var payoutService = {
  generatePayout,
  markPaid,
  markFailed,
  listMine: listMine4,
  listAll: listAll5,
  getById: getById6
};

// src/modules/payout/payout.controler.ts
var listMine5 = catchAsync(async (req, res) => {
  const result = await payoutService.listMine(
    req.user.userId,
    req.query
  );
  sendResponse(res, {
    httpStatusCode: status27.OK,
    success: true,
    message: "Payouts fetched",
    data: result.data,
    meta: result.meta
  });
});
var listAll6 = catchAsync(async (req, res) => {
  const result = await payoutService.listAll(
    req.query
  );
  sendResponse(res, {
    httpStatusCode: status27.OK,
    success: true,
    message: "Payouts fetched",
    data: result.data,
    meta: result.meta
  });
});
var getById7 = catchAsync(async (req, res) => {
  const result = await payoutService.getById(req.params.id, {
    userId: req.user.userId,
    role: req.user.role
  });
  sendResponse(res, {
    httpStatusCode: status27.OK,
    success: true,
    message: "Payout fetched",
    data: result
  });
});
var generate = catchAsync(async (req, res) => {
  const result = await payoutService.generatePayout(req.body);
  sendResponse(res, {
    httpStatusCode: status27.CREATED,
    success: true,
    message: "Payout generated",
    data: result
  });
});
var markPaid2 = catchAsync(async (req, res) => {
  const result = await payoutService.markPaid(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status27.OK,
    success: true,
    message: "Payout marked paid",
    data: result
  });
});
var markFailed2 = catchAsync(async (req, res) => {
  const result = await payoutService.markFailed(
    req.params.id,
    req.body.failureReason
  );
  sendResponse(res, {
    httpStatusCode: status27.OK,
    success: true,
    message: "Payout marked failed",
    data: result
  });
});
var payoutController = {
  listMine: listMine5,
  listAll: listAll6,
  getById: getById7,
  generate,
  markPaid: markPaid2,
  markFailed: markFailed2
};

// src/modules/payout/payout.validation.ts
import { z as z11 } from "zod";
var generatePayoutSchema = z11.object({
  sellerId: z11.string().uuid(),
  periodStart: z11.coerce.date().optional(),
  periodEnd: z11.coerce.date().optional(),
  method: z11.enum(["STRIPE_CONNECT", "MANUAL_BANK"]).optional()
});
var markPayoutPaidSchema = z11.object({
  bankReference: z11.string().max(120).optional(),
  stripeTransferId: z11.string().max(120).optional()
});
var markPayoutFailedSchema = z11.object({
  failureReason: z11.string().min(1).max(500)
});

// src/modules/payout/payout.router.ts
var router12 = Router12();
router12.get(
  "/me",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  payoutController.listMine
);
router12.get(
  "/admin",
  checkAuth(Role.ADMIN, Role.STAFF),
  payoutController.listAll
);
router12.get(
  "/:id",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  payoutController.getById
);
router12.post(
  "/admin/generate",
  checkAuth(Role.ADMIN),
  validateRequest(generatePayoutSchema),
  payoutController.generate
);
router12.patch(
  "/admin/:id/paid",
  checkAuth(Role.ADMIN),
  validateRequest(markPayoutPaidSchema),
  payoutController.markPaid
);
router12.patch(
  "/admin/:id/failed",
  checkAuth(Role.ADMIN),
  validateRequest(markPayoutFailedSchema),
  payoutController.markFailed
);
var payoutRouter = router12;

// src/modules/address/address.router.ts
import { Router as Router13 } from "express";

// src/modules/address/address.controler.ts
import status29 from "http-status";

// src/modules/address/address.service.ts
import status28 from "http-status";
var list5 = async (userId) => prisma.address.findMany({
  where: { userId, isDeleted: false },
  orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
});
var create6 = async (userId, payload) => {
  return prisma.$transaction(async (tx) => {
    if (payload.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDeleted: false },
        data: { isDefault: false }
      });
    }
    return tx.address.create({
      data: {
        userId,
        type: payload.type ?? AddressType.SHIPPING,
        isDefault: payload.isDefault ?? false,
        label: payload.label,
        fullName: payload.fullName,
        phone: payload.phone,
        line1: payload.line1,
        line2: payload.line2,
        city: payload.city,
        state: payload.state,
        country: payload.country.toUpperCase(),
        postalCode: payload.postalCode
      }
    });
  });
};
var update6 = async (userId, id, payload) => {
  const existing = await prisma.address.findFirst({
    where: { id, userId, isDeleted: false }
  });
  if (!existing) throw new AppError_default(status28.NOT_FOUND, "Address not found");
  return prisma.$transaction(async (tx) => {
    if (payload.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDeleted: false, NOT: { id } },
        data: { isDefault: false }
      });
    }
    const data = { ...payload };
    if (payload.country) data.country = payload.country.toUpperCase();
    return tx.address.update({ where: { id }, data });
  });
};
var remove6 = async (userId, id) => {
  const existing = await prisma.address.findFirst({
    where: { id, userId, isDeleted: false }
  });
  if (!existing) throw new AppError_default(status28.NOT_FOUND, "Address not found");
  return prisma.address.update({
    where: { id },
    data: { isDeleted: true, deletedAt: /* @__PURE__ */ new Date() }
  });
};
var addressService = { list: list5, create: create6, update: update6, remove: remove6 };

// src/modules/address/address.controler.ts
var list6 = catchAsync(async (req, res) => {
  const result = await addressService.list(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status29.OK,
    success: true,
    message: "Addresses fetched",
    data: result
  });
});
var create7 = catchAsync(async (req, res) => {
  const result = await addressService.create(req.user.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status29.CREATED,
    success: true,
    message: "Address created",
    data: result
  });
});
var update7 = catchAsync(async (req, res) => {
  const result = await addressService.update(
    req.user.userId,
    req.params.id,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status29.OK,
    success: true,
    message: "Address updated",
    data: result
  });
});
var remove7 = catchAsync(async (req, res) => {
  await addressService.remove(req.user.userId, req.params.id);
  sendResponse(res, {
    httpStatusCode: status29.OK,
    success: true,
    message: "Address deleted"
  });
});
var addressController = { list: list6, create: create7, update: update7, remove: remove7 };

// src/modules/address/address.validation.ts
import { z as z12 } from "zod";
var createAddressSchema = z12.object({
  type: z12.enum(["SHIPPING", "BILLING", "BOTH"]).optional(),
  isDefault: z12.boolean().optional(),
  label: z12.string().max(60).optional(),
  fullName: z12.string().min(2).max(120),
  phone: z12.string().min(5, "Phone is too short").max(30, "Phone is too long"),
  line1: z12.string().min(2).max(200),
  line2: z12.string().max(200).optional(),
  city: z12.string().min(1).max(120),
  state: z12.string().max(120).optional(),
  country: z12.string().min(2, "Country must be at least 2 characters").max(60),
  postalCode: z12.string().min(2).max(20)
});
var updateAddressSchema = createAddressSchema.partial();

// src/modules/address/address.router.ts
var router13 = Router13();
router13.use(checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF));
router13.get("/", addressController.list);
router13.post("/", validateRequest(createAddressSchema), addressController.create);
router13.patch(
  "/:id",
  validateRequest(updateAddressSchema),
  addressController.update
);
router13.delete("/:id", addressController.remove);
var addressRouter = router13;

// src/modules/review/review.router.ts
import { Router as Router14 } from "express";

// src/modules/review/review.controler.ts
import status31 from "http-status";

// src/modules/review/review.service.ts
import status30 from "http-status";
var recomputeProductAggregates = async (productId) => {
  const aggr = await prisma.review.aggregate({
    where: { productId, status: ReviewStatus.APPROVED },
    _avg: { rating: true },
    _count: { _all: true }
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      avgRating: aggr._avg.rating ?? null,
      reviewCount: aggr._count._all
    }
  });
};
var create8 = async (userId, payload) => {
  if (payload.rating < 1 || payload.rating > 5) {
    throw new AppError_default(status30.BAD_REQUEST, "Rating must be between 1 and 5");
  }
  if (payload.orderItemId) {
    const item = await prisma.orderItem.findFirst({
      where: {
        id: payload.orderItemId,
        productId: payload.productId,
        order: { userId }
      }
    });
    if (!item) {
      throw new AppError_default(
        status30.BAD_REQUEST,
        "Order item not found or doesn't belong to user"
      );
    }
  }
  const review = await prisma.review.create({
    data: {
      productId: payload.productId,
      userId,
      orderItemId: payload.orderItemId ?? null,
      rating: payload.rating,
      title: payload.title,
      comment: payload.comment,
      status: payload.orderItemId ? ReviewStatus.APPROVED : ReviewStatus.PENDING,
      images: payload.images?.length ? { create: payload.images } : void 0
    },
    include: { images: true }
  });
  if (review.status === ReviewStatus.APPROVED) {
    await recomputeProductAggregates(payload.productId);
  }
  return review;
};
var listForProduct2 = async (productId, query2) => {
  const page = Math.max(1, Number(query2.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query2.limit) || 10));
  const skip = (page - 1) * limit;
  const where = { productId, status: ReviewStatus.APPROVED };
  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        images: true,
        user: { select: { id: true, name: true, image: true } }
      }
    }),
    prisma.review.count({ where })
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};
var moderate = async (id, status_) => {
  const review = await prisma.review.update({
    where: { id },
    data: { status: status_ }
  });
  await recomputeProductAggregates(review.productId);
  return review;
};
var remove8 = async (userId, id, isAdmin = false) => {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new AppError_default(status30.NOT_FOUND, "Review not found");
  if (!isAdmin && review.userId !== userId) {
    throw new AppError_default(status30.FORBIDDEN, "Cannot delete another user's review");
  }
  await prisma.review.delete({ where: { id } });
  await recomputeProductAggregates(review.productId);
};
var reviewService = { create: create8, listForProduct: listForProduct2, moderate, remove: remove8 };

// src/modules/review/review.controler.ts
var create9 = catchAsync(async (req, res) => {
  const result = await reviewService.create(req.user.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status31.CREATED,
    success: true,
    message: "Review submitted",
    data: result
  });
});
var listForProduct3 = catchAsync(async (req, res) => {
  const result = await reviewService.listForProduct(
    req.params.productId,
    req.query
  );
  sendResponse(res, {
    httpStatusCode: status31.OK,
    success: true,
    message: "Reviews fetched",
    data: result.data,
    meta: result.meta
  });
});
var moderate2 = catchAsync(async (req, res) => {
  const result = await reviewService.moderate(
    req.params.id,
    req.body.status
  );
  sendResponse(res, {
    httpStatusCode: status31.OK,
    success: true,
    message: "Review moderated",
    data: result
  });
});
var remove9 = catchAsync(async (req, res) => {
  const isAdmin = req.user?.role === "ADMIN" || req.user?.role === "STAFF";
  await reviewService.remove(req.user.userId, req.params.id, isAdmin);
  sendResponse(res, {
    httpStatusCode: status31.OK,
    success: true,
    message: "Review deleted"
  });
});
var reviewController = { create: create9, listForProduct: listForProduct3, moderate: moderate2, remove: remove9 };

// src/modules/review/review.validation.ts
import { z as z13 } from "zod";
var createReviewSchema = z13.object({
  productId: z13.string().uuid("productId must be a UUID"),
  orderItemId: z13.string().uuid("orderItemId must be a UUID").optional(),
  rating: z13.number().int("Rating must be an integer").min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  title: z13.string().max(200).optional(),
  comment: z13.string().max(4e3).optional(),
  images: z13.array(
    z13.object({
      url: z13.string().url("Image URL must be valid").max(800)
    })
  ).max(8, "Maximum 8 images per review").optional()
});
var moderateReviewSchema = z13.object({
  status: z13.enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED"])
});

// src/modules/review/review.router.ts
var router14 = Router14();
router14.get("/product/:productId", reviewController.listForProduct);
router14.post(
  "/",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  validateRequest(createReviewSchema),
  reviewController.create
);
router14.delete(
  "/:id",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  reviewController.remove
);
router14.patch(
  "/:id/moderate",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(moderateReviewSchema),
  reviewController.moderate
);
var reviewRouter = router14;

// src/modules/wishlist/wishlist.router.ts
import { Router as Router15 } from "express";

// src/modules/wishlist/wishlist.controler.ts
import status33 from "http-status";

// src/modules/wishlist/wishlist.service.ts
import status32 from "http-status";
var getOrCreate = async (userId) => {
  const existing = await prisma.wishlist.findUnique({ where: { userId } });
  if (!existing) {
    await prisma.wishlist.create({ data: { userId } });
  }
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { images: { orderBy: { sortOrder: "asc" } } }
          }
        },
        orderBy: { addedAt: "desc" }
      }
    }
  });
  if (!wishlist) throw new AppError_default(status32.INTERNAL_SERVER_ERROR, "Wishlist creation failed");
  return wishlist;
};
var addItem3 = async (userId, productId) => {
  const wishlist = await getOrCreate(userId);
  const product = await prisma.product.findFirst({
    where: { id: productId, isDeleted: false }
  });
  if (!product) throw new AppError_default(status32.NOT_FOUND, "Product not found");
  await prisma.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    create: { wishlistId: wishlist.id, productId },
    update: {}
  });
  return getOrCreate(userId);
};
var removeItem3 = async (userId, productId) => {
  const wishlist = await getOrCreate(userId);
  await prisma.wishlistItem.deleteMany({
    where: { wishlistId: wishlist.id, productId }
  });
  return getOrCreate(userId);
};
var wishlistService = { getOrCreate, addItem: addItem3, removeItem: removeItem3 };

// src/modules/wishlist/wishlist.controler.ts
var get2 = catchAsync(async (req, res) => {
  const result = await wishlistService.getOrCreate(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status33.OK,
    success: true,
    message: "Wishlist fetched",
    data: result
  });
});
var addItem4 = catchAsync(async (req, res) => {
  const result = await wishlistService.addItem(req.user.userId, req.body.productId);
  sendResponse(res, {
    httpStatusCode: status33.OK,
    success: true,
    message: "Added to wishlist",
    data: result
  });
});
var removeItem4 = catchAsync(async (req, res) => {
  const result = await wishlistService.removeItem(
    req.user.userId,
    req.params.productId
  );
  sendResponse(res, {
    httpStatusCode: status33.OK,
    success: true,
    message: "Removed from wishlist",
    data: result
  });
});
var wishlistController = { get: get2, addItem: addItem4, removeItem: removeItem4 };

// src/modules/wishlist/wishlist.validation.ts
import { z as z14 } from "zod";
var addWishlistItemSchema = z14.object({
  productId: z14.string().uuid("productId must be a UUID")
});

// src/modules/wishlist/wishlist.router.ts
var router15 = Router15();
router15.use(checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF));
router15.get("/", wishlistController.get);
router15.post(
  "/items",
  validateRequest(addWishlistItemSchema),
  wishlistController.addItem
);
router15.delete("/items/:productId", wishlistController.removeItem);
var wishlistRouter = router15;

// src/modules/stats/stats.router.ts
import { Router as Router16 } from "express";

// src/modules/stats/stats.controler.ts
import status34 from "http-status";

// src/modules/stats/stats.service.ts
var overview = async () => {
  const [totalProducts, totalOrders, totalCustomers, totalAdmins] = await Promise.all([
    prisma.product.count({ where: { isDeleted: false } }),
    prisma.order.count(),
    prisma.user.count({ where: { role: Role.CUSTOMER, isDeleted: false } }),
    prisma.user.count({ where: { role: Role.ADMIN, isDeleted: false } })
  ]);
  const paidOrders = await prisma.order.findMany({
    where: { paymentStatus: PaymentStatus.PAID },
    select: { grandTotal: true }
  });
  const totalRevenue = paidOrders.reduce(
    (s, o) => s + toNumber(o.grandTotal),
    0
  );
  const [pendingOrders, paidOrdersCount, shippedOrders, deliveredOrders, cancelledOrders] = await Promise.all([
    prisma.order.count({ where: { status: OrderStatus.PENDING_PAYMENT } }),
    prisma.order.count({ where: { status: OrderStatus.PAID } }),
    prisma.order.count({ where: { status: OrderStatus.SHIPPED } }),
    prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
    prisma.order.count({ where: { status: OrderStatus.CANCELLED } })
  ]);
  const lowStockProducts = await prisma.product.count({
    where: {
      isDeleted: false,
      trackInventory: true,
      stock: { lte: 5 }
    }
  });
  return {
    totals: {
      products: totalProducts,
      orders: totalOrders,
      customers: totalCustomers,
      admins: totalAdmins,
      revenue: Math.round(totalRevenue * 100) / 100,
      lowStockProducts
    },
    orderBreakdown: {
      pending: pendingOrders,
      paid: paidOrdersCount,
      shipped: shippedOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders
    }
  };
};
var recentOrders = async (limit = 10) => {
  const orders = await prisma.order.findMany({
    orderBy: { placedAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { select: { id: true, productName: true, quantity: true } }
    }
  });
  return orders;
};
var topProducts = async (limit = 10) => {
  return prisma.product.findMany({
    where: { isDeleted: false },
    orderBy: [{ soldCount: "desc" }, { avgRating: "desc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      soldCount: true,
      avgRating: true,
      reviewCount: true
    }
  });
};
var revenueByDay = async (days = 14) => {
  const since = /* @__PURE__ */ new Date();
  since.setDate(since.getDate() - days);
  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.PAID,
      paidAt: { gte: since }
    },
    select: { paidAt: true, grandTotal: true }
  });
  const buckets2 = {};
  for (const o of orders) {
    if (!o.paidAt) continue;
    const day = o.paidAt.toISOString().slice(0, 10);
    buckets2[day] = (buckets2[day] ?? 0) + toNumber(o.grandTotal);
  }
  return Object.entries(buckets2).sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total: Math.round(total * 100) / 100 }));
};
var marketplace = async () => {
  const [
    totalSellers,
    pendingSellers,
    approvedSellers,
    suspendedSellers,
    rejectedSellers
  ] = await Promise.all([
    prisma.seller.count({ where: { isDeleted: false } }),
    prisma.seller.count({ where: { status: SellerStatus.PENDING, isDeleted: false } }),
    prisma.seller.count({ where: { status: SellerStatus.APPROVED, isDeleted: false } }),
    prisma.seller.count({ where: { status: SellerStatus.SUSPENDED, isDeleted: false } }),
    prisma.seller.count({ where: { status: SellerStatus.REJECTED, isDeleted: false } })
  ]);
  const sellerOrders = await prisma.sellerOrder.findMany({
    where: {
      order: { paymentStatus: PaymentStatus.PAID }
    },
    select: { grandTotal: true, commissionAmount: true, payoutAmount: true }
  });
  const gmv = sellerOrders.reduce((s, o) => s + toNumber(o.grandTotal), 0);
  const totalCommission = sellerOrders.reduce(
    (s, o) => s + toNumber(o.commissionAmount),
    0
  );
  const sellerPayoutGross = sellerOrders.reduce(
    (s, o) => s + toNumber(o.payoutAmount),
    0
  );
  return {
    sellers: {
      total: totalSellers,
      pending: pendingSellers,
      approved: approvedSellers,
      suspended: suspendedSellers,
      rejected: rejectedSellers
    },
    money: {
      gmv: Math.round(gmv * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      sellerPayoutGross: Math.round(sellerPayoutGross * 100) / 100
    }
  };
};
var topSellers = async (limit = 10) => {
  return prisma.seller.findMany({
    where: { isDeleted: false, status: SellerStatus.APPROVED },
    orderBy: [{ totalSales: "desc" }, { orderCount: "desc" }],
    take: limit,
    select: {
      id: true,
      shopName: true,
      shopSlug: true,
      logo: true,
      totalSales: true,
      orderCount: true,
      avgRating: true,
      productCount: true
    }
  });
};
var payoutPipeline = async () => {
  const [pending, processing, paid, failed] = await Promise.all([
    prisma.sellerPayout.aggregate({
      where: { status: PayoutStatus.PENDING },
      _sum: { netAmount: true },
      _count: true
    }),
    prisma.sellerPayout.aggregate({
      where: { status: PayoutStatus.PROCESSING },
      _sum: { netAmount: true },
      _count: true
    }),
    prisma.sellerPayout.aggregate({
      where: { status: PayoutStatus.PAID },
      _sum: { netAmount: true },
      _count: true
    }),
    prisma.sellerPayout.aggregate({
      where: { status: PayoutStatus.FAILED },
      _sum: { netAmount: true },
      _count: true
    })
  ]);
  const accruedItems = await prisma.sellerPayoutItem.aggregate({
    where: { payoutId: null },
    _sum: { netAmount: true },
    _count: true
  });
  const fmt = (a) => ({
    count: a._count,
    amount: Math.round(toNumber(a._sum.netAmount) * 100) / 100
  });
  return {
    accrued: fmt(accruedItems),
    pending: fmt(pending),
    processing: fmt(processing),
    paid: fmt(paid),
    failed: fmt(failed)
  };
};
var statsService = { overview, recentOrders, topProducts, revenueByDay, marketplace, topSellers, payoutPipeline };

// src/modules/stats/stats.controler.ts
var overview2 = catchAsync(async (_req, res) => {
  const result = await statsService.overview();
  sendResponse(res, {
    httpStatusCode: status34.OK,
    success: true,
    message: "Stats overview",
    data: result
  });
});
var recentOrders2 = catchAsync(async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const result = await statsService.recentOrders(limit);
  sendResponse(res, {
    httpStatusCode: status34.OK,
    success: true,
    message: "Recent orders",
    data: result
  });
});
var topProducts2 = catchAsync(async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const result = await statsService.topProducts(limit);
  sendResponse(res, {
    httpStatusCode: status34.OK,
    success: true,
    message: "Top products",
    data: result
  });
});
var revenueByDay2 = catchAsync(async (req, res) => {
  const days = Number(req.query.days) || 14;
  const result = await statsService.revenueByDay(days);
  sendResponse(res, {
    httpStatusCode: status34.OK,
    success: true,
    message: "Revenue by day",
    data: result
  });
});
var marketplace2 = catchAsync(async (_req, res) => {
  const result = await statsService.marketplace();
  sendResponse(res, {
    httpStatusCode: status34.OK,
    success: true,
    message: "Marketplace KPIs",
    data: result
  });
});
var topSellers2 = catchAsync(async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const result = await statsService.topSellers(limit);
  sendResponse(res, {
    httpStatusCode: status34.OK,
    success: true,
    message: "Top sellers",
    data: result
  });
});
var payoutPipeline2 = catchAsync(async (_req, res) => {
  const result = await statsService.payoutPipeline();
  sendResponse(res, {
    httpStatusCode: status34.OK,
    success: true,
    message: "Payout pipeline",
    data: result
  });
});
var statsController = { overview: overview2, recentOrders: recentOrders2, topProducts: topProducts2, revenueByDay: revenueByDay2, marketplace: marketplace2, topSellers: topSellers2, payoutPipeline: payoutPipeline2 };

// src/modules/stats/stats.router.ts
var router16 = Router16();
router16.use(checkAuth(Role.ADMIN, Role.STAFF));
router16.get("/overview", statsController.overview);
router16.get("/recent-orders", statsController.recentOrders);
router16.get("/top-products", statsController.topProducts);
router16.get("/revenue", statsController.revenueByDay);
router16.get("/marketplace", statsController.marketplace);
router16.get("/top-sellers", statsController.topSellers);
router16.get("/payout-pipeline", statsController.payoutPipeline);
var StatsRoutes = router16;

// src/modules/payment/payment.router.ts
import { Router as Router17 } from "express";

// src/modules/payment/payment.controler.ts
import status36 from "http-status";

// src/modules/payment/payment.service.ts
import Stripe from "stripe";
import status35 from "http-status";
var stripeKey = envVars.STRIPE.STRIPE_SECRET_KEY;
var stripe = stripeKey ? new Stripe(stripeKey) : null;
var requireStripe = () => {
  if (!stripe) {
    throw new AppError_default(
      status35.SERVICE_UNAVAILABLE,
      "Stripe is not configured. Set STRIPE_SECRET_KEY."
    );
  }
  return stripe;
};
var createPaymentIntent = async (orderId, userId) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId }
  });
  if (!order) throw new AppError_default(status35.NOT_FOUND, "Order not found");
  if (order.paymentStatus === PaymentStatus.PAID) {
    throw new AppError_default(status35.BAD_REQUEST, "Order is already paid");
  }
  const s = requireStripe();
  const amountCents = Math.round(toNumber(order.grandTotal) * 100);
  const intent = await s.paymentIntents.create({
    amount: amountCents,
    currency: order.currency.toLowerCase(),
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId
    },
    automatic_payment_methods: { enabled: true }
  });
  await prisma.payment.create({
    data: {
      orderId: order.id,
      method: PaymentMethod.STRIPE,
      status: PaymentStatus.UNPAID,
      currency: order.currency,
      amount: order.grandTotal,
      stripePaymentIntentId: intent.id
    }
  });
  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amount: toNumber(order.grandTotal),
    currency: order.currency
  };
};
var handleStripeWebhookEvent = async (rawBody, signature) => {
  const s = requireStripe();
  const webhookSecret = envVars.STRIPE.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new AppError_default(status35.SERVICE_UNAVAILABLE, "Webhook secret missing");
  }
  let event;
  try {
    event = s.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    throw new AppError_default(status35.BAD_REQUEST, `Webhook error: ${err.message}`);
  }
  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object;
      const orderId = intent.metadata?.orderId;
      if (!orderId) break;
      await prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: /* @__PURE__ */ new Date(),
            stripeChargeId: intent.latest_charge,
            stripeEventId: event.id,
            paymentGatewayData: intent
          }
        });
        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.PAID,
            paidAt: /* @__PURE__ */ new Date()
          }
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            toStatus: OrderStatus.PAID,
            note: "Payment succeeded"
          }
        });
      });
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order) {
        await notificationService.createNotification({
          userId: order.userId,
          type: NotificationType.ORDER_PAID,
          title: "Payment received",
          message: `Payment for order ${order.orderNumber} was successful.`,
          actionUrl: `/orders/${order.id}`,
          metadata: { orderId: order.id }
        }).catch(() => null);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      const orderId = intent.metadata?.orderId;
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: intent.last_payment_error?.message ?? "Payment failed",
          stripeEventId: event.id
        }
      });
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: PaymentStatus.FAILED }
        });
      }
      break;
    }
    case "account.updated": {
      const account = event.data.object;
      const { stripeConnectService: stripeConnectService2 } = await import("./stripeConnect.service-MLZ3KLKF.js");
      await stripeConnectService2.onAccountUpdated(account).catch(() => null);
      break;
    }
    case "charge.refunded": {
      break;
    }
    default:
      break;
  }
  return { received: true, type: event.type };
};
var paymentService = {
  createPaymentIntent,
  handleStripeWebhookEvent
};

// src/modules/payment/payment.controler.ts
var createPaymentIntent2 = catchAsync(async (req, res) => {
  const result = await paymentService.createPaymentIntent(
    req.params.orderId,
    req.user.userId
  );
  sendResponse(res, {
    httpStatusCode: status36.OK,
    success: true,
    message: "Payment intent created",
    data: result
  });
});
var handleStripeWebhookEvent2 = async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];
    const result = await paymentService.handleStripeWebhookEvent(
      req.body,
      sig
    );
    res.status(200).json(result);
  } catch (err) {
    res.status(err?.statusCode ?? 400).json({ success: false, message: err?.message ?? "Webhook error" });
  }
};
var PaymentController = {
  createPaymentIntent: createPaymentIntent2,
  handleStripeWebhookEvent: handleStripeWebhookEvent2
};

// src/modules/payment/payment.router.ts
var router17 = Router17();
router17.post(
  "/orders/:orderId/intent",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  PaymentController.createPaymentIntent
);
var PaymentRoutes = router17;

// src/modules/notification/notification.route.ts
import { Router as Router18 } from "express";

// src/modules/notification/notification.controler.ts
import status37 from "http-status";
var list7 = catchAsync(async (req, res) => {
  const result = await notificationService.listForUser(
    req.user.userId,
    req.query
  );
  sendResponse(res, {
    httpStatusCode: status37.OK,
    success: true,
    message: "Notifications fetched",
    data: { notifications: result.data, unreadCount: result.unreadCount },
    meta: result.meta
  });
});
var markAsRead = catchAsync(async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user.userId);
  sendResponse(res, {
    httpStatusCode: status37.OK,
    success: true,
    message: "Notification marked as read"
  });
});
var markAllAsRead = catchAsync(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status37.OK,
    success: true,
    message: "All notifications marked as read",
    data: { count: result.count }
  });
});
var remove10 = catchAsync(async (req, res) => {
  await notificationService.deleteNotification(
    req.params.id,
    req.user.userId
  );
  sendResponse(res, {
    httpStatusCode: status37.OK,
    success: true,
    message: "Notification deleted"
  });
});
var notificationController = { list: list7, markAsRead, markAllAsRead, remove: remove10 };

// src/modules/notification/notification.route.ts
var router18 = Router18();
router18.use(checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF));
router18.get("/", notificationController.list);
router18.patch("/read-all", notificationController.markAllAsRead);
router18.patch("/:id/read", notificationController.markAsRead);
router18.delete("/:id", notificationController.remove);
var notificationRouter = router18;

// src/modules/ai/ai.router.ts
import { Router as Router19 } from "express";

// src/modules/ai/ai.controller.ts
import httpStatus from "http-status";

// src/modules/ai/ai.service.ts
import status38 from "http-status";
var SYSTEM_PROMPT = `You are ConsultEdge AI Support for a consultation booking platform.
Your job is to help website visitors with expert discovery, consultation booking, schedules, payments, and account guidance.
Rules:
- Be concise, clear, and friendly.
- Prefer practical next steps.
- If the issue involves refunds, billing disputes, legal issues, or account security, recommend admin/human support.
- Do not invent pricing, policies, or expert availability.
- Keep responses short enough for a homepage support widget.`;
var bookingKeywords = ["book", "booking", "appointment", "consultation", "schedule", "slot"];
var paymentKeywords = ["pay", "payment", "checkout", "card", "refund", "invoice", "billing"];
var expertKeywords = ["expert", "mentor", "consultant", "specialist", "advisor"];
var technicalKeywords = ["bug", "error", "issue", "login", "otp", "password", "not working"];
var escalationKeywords = [
  "human",
  "admin",
  "agent",
  "refund",
  "charged twice",
  "billing issue",
  "legal",
  "complaint",
  "security",
  "hack",
  "urgent"
];
var includesAny = (text, keywords) => keywords.some((keyword) => text.includes(keyword));
var buildSuggestedActions = (message, context) => {
  const normalized = message.toLowerCase();
  if (context === "payment" || includesAny(normalized, paymentKeywords)) {
    return [
      "Check your payment or booking status in the dashboard",
      "Retry with a valid payment method if checkout failed",
      "Contact admin support for refund or billing review"
    ];
  }
  if (context === "expert" || includesAny(normalized, expertKeywords)) {
    return [
      "Browse verified experts by industry or skill",
      "Open an expert profile to review experience and availability",
      "Start a chat or book a consultation slot"
    ];
  }
  if (context === "technical" || includesAny(normalized, technicalKeywords)) {
    return [
      "Refresh the page and sign in again",
      "Make sure your browser allows cookies for authentication",
      "If the issue continues, contact admin support"
    ];
  }
  return [
    "Browse experts from the homepage",
    "Select a suitable slot and book a consultation",
    "Use dashboard chat for direct communication after booking"
  ];
};
var buildFallbackReply = (message, context) => {
  const normalized = message.toLowerCase();
  if (context === "payment" || includesAny(normalized, paymentKeywords)) {
    return "I can help with payment guidance. Please confirm whether your issue is checkout failure, booking not appearing, or a refund request. For billing disputes or refunds, admin support should review it directly.";
  }
  if (context === "expert" || includesAny(normalized, expertKeywords)) {
    return "You can explore verified experts, compare their profiles, and choose a matching consultation slot. If you want, ask me what kind of expert you need and I\u2019ll guide you.";
  }
  if (context === "technical" || includesAny(normalized, technicalKeywords)) {
    return "It looks like a technical or account issue. Try signing in again, refreshing the page, and checking your connection. If it still fails, please contact admin support for manual help.";
  }
  if (context === "booking" || includesAny(normalized, bookingKeywords)) {
    return "To book a consultation, choose an expert, review the available schedule, and confirm the booking from the platform. If a slot is missing, it may not be published or available yet.";
  }
  return "Hi \u2014 I can help with finding experts, booking consultations, schedules, payments, and general platform guidance. Tell me what you need, and I\u2019ll guide you step by step.";
};
var shouldEscalateToHuman = (message) => {
  const normalized = message.toLowerCase();
  return includesAny(normalized, escalationKeywords);
};
var buildMessages = (payload) => {
  const history = (payload.history ?? []).map((item) => ({
    role: item.role,
    content: item.content
  }));
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    {
      role: "user",
      content: payload.context ? `Context: ${payload.context}
User message: ${payload.message}` : payload.message
    }
  ];
};
var generateOpenAIReply = async (payload) => {
  if (!envVars.OPENAI_API_KEY) {
    return null;
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${envVars.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: envVars.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 300,
      messages: buildMessages(payload)
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
};
var askSupport = async (payload) => {
  const message = payload.message?.trim();
  if (!message) {
    throw new AppError_default(status38.BAD_REQUEST, "Message is required");
  }
  const suggestedActions = buildSuggestedActions(message, payload.context);
  const escalatedToHuman = shouldEscalateToHuman(message);
  try {
    const aiReply = await generateOpenAIReply({ ...payload, message });
    const reply = aiReply || buildFallbackReply(message, payload.context);
    return {
      reply,
      suggestedActions,
      escalatedToHuman,
      provider: aiReply ? "openai" : "fallback",
      model: aiReply ? envVars.OPENAI_MODEL || "gpt-4o-mini" : "rule-based-support",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    console.error("AI support error:", error);
    return {
      reply: buildFallbackReply(message, payload.context),
      suggestedActions,
      escalatedToHuman,
      provider: "fallback",
      model: "rule-based-support",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};
var aiService = {
  askSupport
};

// src/modules/ai/ai.controller.ts
var askSupport2 = catchAsync(async (req, res) => {
  const result = await aiService.askSupport(req.body);
  sendResponse(res, {
    httpStatusCode: httpStatus.OK,
    success: true,
    message: "AI support response generated successfully",
    data: result
  });
});
var aiController = {
  askSupport: askSupport2
};

// src/modules/ai/services/aiAdvanced.service.ts
var ok = (data, meta = {}) => ({
  data,
  meta: {
    provider: "stub",
    model: "nexora-stub",
    tokensUsed: 0,
    latencyMs: 0,
    ...meta
  }
});
var recommendations = async (payload) => ok({
  products: [],
  message: "AI recommendations are not yet wired up."
});
var industryCreation = async (payload) => ok({
  industryName: payload.industryName,
  description: payload.description ?? "",
  suggestedCategories: [],
  suggestedTags: []
});
var search = async (payload) => ok({ query: payload.query, results: [] });
var summary = async (payload) => ok({
  audience: payload.audience ?? "general",
  summary: "AI summarization is not yet enabled in this build. The provided text was received successfully.",
  bullets: [],
  wordCount: payload.text.split(/\s+/).filter(Boolean).length
});
var chat = async (payload) => ok({
  conversationId: payload.conversationId ?? null,
  reply: "Hi! Nexora's AI shopping assistant is coming soon. We received your message: " + payload.message.slice(0, 200)
});
var documentAnalysis = async (payload) => ok({
  objective: payload.objective ?? null,
  findings: [],
  risks: [],
  recommendations: []
});
var aiAdvancedService = {
  recommendations,
  industryCreation,
  search,
  summary,
  chat,
  documentAnalysis
};

// src/modules/ai/utils/response.ts
var sendAIResponse = (res, data, meta, statusCode = 200) => {
  res.locals.aiMeta = meta;
  return res.status(statusCode).json({ success: true, data, meta });
};

// src/modules/ai/utils/sanitize.ts
var CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
var INJECTION_PATTERNS = [
  /ignore (all|previous|above) (instructions|prompts)/gi,
  /you are now/gi,
  /system prompt:/gi
];
var sanitizeText = (input, maxLength = 8e3) => {
  if (typeof input !== "string") return "";
  let text = input.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  for (const pattern of INJECTION_PATTERNS) {
    text = text.replace(pattern, "[filtered]");
  }
  if (text.length > maxLength) text = text.slice(0, maxLength);
  return text;
};
var sanitizeObject = (obj) => {
  const out = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === "string") {
      out[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      out[key] = value.map(
        (v) => typeof v === "string" ? sanitizeText(v) : v && typeof v === "object" ? sanitizeObject(v) : v
      );
    } else if (value && typeof value === "object") {
      out[key] = sanitizeObject(value);
    } else {
      out[key] = value;
    }
  }
  return out;
};

// src/modules/ai/controllers/aiAdvanced.controller.ts
var recommendations2 = catchAsync(async (req, res) => {
  const payload = sanitizeObject(req.body);
  const { data, meta } = await aiAdvancedService.recommendations(payload);
  sendAIResponse(res, data, meta);
});
var industryCreation2 = catchAsync(async (req, res) => {
  const payload = sanitizeObject(req.body);
  payload.industryName = sanitizeText(payload.industryName, 100);
  const { data, meta } = await aiAdvancedService.industryCreation(payload);
  sendAIResponse(res, data, meta);
});
var search2 = catchAsync(async (req, res) => {
  const payload = sanitizeObject(req.body);
  payload.query = sanitizeText(payload.query, 500);
  const { data, meta } = await aiAdvancedService.search(payload);
  sendAIResponse(res, data, meta);
});
var summary2 = catchAsync(async (req, res) => {
  const payload = req.body;
  const { data, meta } = await aiAdvancedService.summary({
    text: sanitizeText(payload.text, 16e3),
    audience: payload.audience ? sanitizeText(payload.audience, 100) : void 0
  });
  sendAIResponse(res, data, meta);
});
var chat2 = catchAsync(async (req, res) => {
  const payload = sanitizeObject(req.body);
  payload.message = sanitizeText(payload.message, 4e3);
  const { data, meta } = await aiAdvancedService.chat(payload);
  sendAIResponse(res, data, meta);
});
var documentAnalysis2 = catchAsync(async (req, res) => {
  const payload = req.body;
  const { data, meta } = await aiAdvancedService.documentAnalysis({
    text: sanitizeText(payload.text, 32e3),
    objective: payload.objective ? sanitizeText(payload.objective, 500) : void 0
  });
  sendAIResponse(res, data, meta);
});
var aiAdvancedController = {
  recommendations: recommendations2,
  industryCreation: industryCreation2,
  search: search2,
  summary: summary2,
  chat: chat2,
  documentAnalysis: documentAnalysis2
};

// src/modules/ai/controllers/aiChat.controller.ts
import httpStatus3 from "http-status";

// src/modules/ai/services/aiChat.service.ts
import httpStatus2 from "http-status";

// src/modules/ai/prompts/chatPrompt.ts
var CHAT_SYSTEM_PROMPT = `You are ConsultEdge AI Assistant.
You help users discover experts, plan consultations, and understand the platform.
Rules:
- Be concise, friendly, and practical.
- Never invent expert names, prices, or availability.
- For refunds, billing disputes, or account security, recommend admin/human support.
- Keep replies suitable for a chat widget (1-4 short paragraphs).`;
var buildChatMessages = (input) => {
  const history = (input.history ?? []).map((h) => ({ role: h.role, content: h.content }));
  return [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    ...history,
    {
      role: "user",
      content: input.context ? `Context: ${input.context}
User message: ${input.message}` : input.message
    }
  ];
};

// src/modules/ai/utils/aiProvider.ts
import status39 from "http-status";
var resolveProvider = () => {
  const explicit = envVars.AI_PROVIDER;
  if (explicit === "openai" && envVars.OPENAI_API_KEY) return "openai";
  if (explicit === "gemini" && envVars.GEMINI_API_KEY) return "gemini";
  if (envVars.OPENAI_API_KEY) return "openai";
  if (envVars.GEMINI_API_KEY) return "gemini";
  throw new AppError_default(
    status39.SERVICE_UNAVAILABLE,
    "No AI provider configured. Set AI_PROVIDER and the corresponding API key."
  );
};
var callOpenAI = async (opts) => {
  if (!envVars.OPENAI_API_KEY) {
    throw new AppError_default(status39.SERVICE_UNAVAILABLE, "OPENAI_API_KEY missing");
  }
  const model = envVars.OPENAI_MODEL || "gpt-4o-mini";
  const startedAt2 = Date.now();
  const body = {
    model,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 600,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content }))
  };
  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${envVars.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new AppError_default(
      status39.BAD_GATEWAY,
      `OpenAI request failed: ${response.status} ${errText.slice(0, 300)}`
    );
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  return {
    text,
    model,
    provider: "openai",
    tokensUsed: data.usage?.total_tokens ?? 0,
    latencyMs: Date.now() - startedAt2,
    raw: data
  };
};
var callGemini = async (opts) => {
  if (!envVars.GEMINI_API_KEY) {
    throw new AppError_default(status39.SERVICE_UNAVAILABLE, "GEMINI_API_KEY missing");
  }
  const model = envVars.GEMINI_MODEL || "gemini-2.0-flash";
  const startedAt2 = Date.now();
  const systemMessages = opts.messages.filter((m) => m.role === "system");
  const turnMessages = opts.messages.filter((m) => m.role !== "system");
  const body = {
    contents: turnMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    })),
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxTokens ?? 600,
      ...opts.jsonMode ? { responseMimeType: "application/json" } : {}
    }
  };
  if (systemMessages.length > 0) {
    body.systemInstruction = {
      role: "system",
      parts: [{ text: systemMessages.map((m) => m.content).join("\n\n") }]
    };
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(envVars.GEMINI_API_KEY)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new AppError_default(
      status39.BAD_GATEWAY,
      `Gemini request failed: ${response.status} ${errText.slice(0, 300)}`
    );
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
  return {
    text,
    model,
    provider: "gemini",
    tokensUsed: data.usageMetadata?.totalTokenCount ?? 0,
    latencyMs: Date.now() - startedAt2,
    raw: data
  };
};
var aiProvider = {
  /** Generate a chat completion using the configured provider, with one fallback. */
  async generate(opts) {
    const primary = resolveProvider();
    const hasOpenAI = !!envVars.OPENAI_API_KEY;
    const hasGemini = !!envVars.GEMINI_API_KEY;
    const fallback = primary === "gemini" && hasOpenAI ? "openai" : primary === "openai" && hasGemini ? "gemini" : null;
    try {
      return primary === "openai" ? await callOpenAI(opts) : await callGemini(opts);
    } catch (err) {
      if (!fallback) throw err;
      console.warn(
        `[ai] primary provider "${primary}" failed; retrying with "${fallback}"`,
        err instanceof Error ? err.message : err
      );
      return fallback === "openai" ? callOpenAI(opts) : callGemini(opts);
    }
  },
  /**
   * Generate and parse JSON output. Falls back to wrapping plain text if the
   * provider returns a non-JSON response.
   */
  async generateJSON(opts) {
    const result = await this.generate({ ...opts, jsonMode: true });
    let parsed = null;
    try {
      const cleaned = result.text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = null;
    }
    return { data: parsed, meta: result };
  },
  getActiveProvider: resolveProvider,
  /** Non-throwing introspection of which providers have keys configured. */
  getConfiguredProviders() {
    const list9 = [];
    if (envVars.OPENAI_API_KEY) list9.push("openai");
    if (envVars.GEMINI_API_KEY) list9.push("gemini");
    return list9;
  },
  /** Lightweight reachability probe used by GET /ai/health. */
  async ping() {
    const configured = this.getConfiguredProviders();
    if (configured.length === 0) {
      return { provider: "none", status: "unconfigured", latencyMs: 0 };
    }
    const startedAt2 = Date.now();
    try {
      const result = await this.generate({
        messages: [
          { role: "system", content: "You are a health probe. Reply with the single word: ok." },
          { role: "user", content: "ping" }
        ],
        temperature: 0,
        maxTokens: 5
      });
      return {
        provider: result.provider,
        status: "ok",
        latencyMs: Date.now() - startedAt2,
        model: result.model
      };
    } catch (err) {
      return {
        provider: configured[0],
        status: "down",
        latencyMs: Date.now() - startedAt2,
        error: err instanceof Error ? err.message : "unknown error"
      };
    }
  }
};

// src/modules/ai/services/aiChat.service.ts
var MAX_HISTORY_MESSAGES = 20;
var aiMessageSelect = {
  id: true,
  role: true,
  content: true,
  model: true,
  provider: true,
  tokensUsed: true,
  latencyMs: true,
  feedback: true,
  createdAt: true
};
var formatRole = (role) => {
  if (role === AIChatMessageRole.USER) return "user";
  if (role === AIChatMessageRole.ASSISTANT) return "assistant";
  return "system";
};
var formatMessage = (message) => ({
  id: message.id,
  role: formatRole(message.role),
  content: message.content,
  feedback: message.feedback,
  model: message.model ?? null,
  provider: message.provider ?? null,
  tokensUsed: message.tokensUsed ?? 0,
  latencyMs: message.latencyMs ?? 0,
  createdAt: message.createdAt
});
var buildConversationTitle = (message) => {
  const compact = sanitizeText(message, 160).replace(/\s+/g, " ").trim();
  if (compact.length <= 60) return compact;
  return `${compact.slice(0, 57).trimEnd()}...`;
};
var ensureConversationOwner = async (conversationId, userId) => {
  const conversation = await prisma.aIConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, userId: true, title: true, createdAt: true, updatedAt: true }
  });
  if (!conversation || conversation.userId !== userId) {
    throw new AppError_default(httpStatus2.NOT_FOUND, "AI conversation not found");
  }
  return conversation;
};
var getOrCreateConversation = async (userId, conversationId, message) => {
  if (conversationId) {
    return ensureConversationOwner(conversationId, userId);
  }
  return prisma.aIConversation.create({
    data: {
      userId,
      title: buildConversationTitle(message) || "New chat"
    },
    select: { id: true, userId: true, title: true, createdAt: true, updatedAt: true }
  });
};
var sendMessage = async (userId, input) => {
  const cleanMessage = sanitizeText(input.message, 4e3).trim();
  const cleanContext = input.context ? sanitizeText(input.context, 500).trim() : void 0;
  if (!cleanMessage) {
    throw new AppError_default(httpStatus2.BAD_REQUEST, "Message is required");
  }
  const conversation = await getOrCreateConversation(userId, input.conversationId, cleanMessage);
  const historyRows = await prisma.aIChatMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: MAX_HISTORY_MESSAGES,
    select: aiMessageSelect
  });
  const history = historyRows.reverse().filter((item) => item.role !== AIChatMessageRole.SYSTEM).map((item) => ({ role: formatRole(item.role), content: item.content })).filter(
    (item) => item.role === "user" || item.role === "assistant"
  );
  const providerResult = await aiProvider.generate({
    messages: buildChatMessages({
      message: cleanMessage,
      context: cleanContext || void 0,
      history
    }),
    temperature: 0.5,
    maxTokens: 500
  });
  const safeReply = providerResult.text?.trim() || "I'm here to help. Could you share a bit more detail?";
  const { userMessage, assistantMessage, updatedConversation } = await prisma.$transaction(
    async (tx) => {
      const createdUserMessage = await tx.aIChatMessage.create({
        data: {
          conversationId: conversation.id,
          role: AIChatMessageRole.USER,
          content: cleanMessage
        },
        select: aiMessageSelect
      });
      const createdAssistantMessage = await tx.aIChatMessage.create({
        data: {
          conversationId: conversation.id,
          role: AIChatMessageRole.ASSISTANT,
          content: safeReply,
          model: providerResult.model,
          provider: providerResult.provider,
          tokensUsed: providerResult.tokensUsed,
          latencyMs: providerResult.latencyMs
        },
        select: aiMessageSelect
      });
      const refreshedConversation = await tx.aIConversation.update({
        where: { id: conversation.id },
        data: {
          title: conversation.title === "New chat" || !input.conversationId ? buildConversationTitle(cleanMessage) || conversation.title : void 0
        },
        select: { id: true, title: true, createdAt: true, updatedAt: true }
      });
      return {
        userMessage: createdUserMessage,
        assistantMessage: createdAssistantMessage,
        updatedConversation: refreshedConversation
      };
    }
  );
  return {
    data: {
      conversation: updatedConversation,
      userMessage: formatMessage(userMessage),
      assistantMessage: formatMessage(assistantMessage)
    },
    meta: {
      model: providerResult.model,
      provider: providerResult.provider,
      tokensUsed: providerResult.tokensUsed,
      latencyMs: providerResult.latencyMs
    }
  };
};
var listConversations = async (userId) => {
  const conversations = await prisma.aIConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          role: true,
          createdAt: true
        }
      }
    }
  });
  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    preview: conversation.messages[0]?.content ?? "",
    lastMessageRole: conversation.messages[0] ? formatRole(conversation.messages[0].role) : null,
    lastMessageAt: conversation.messages[0]?.createdAt ?? conversation.updatedAt,
    messageCount: conversation._count.messages,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt
  }));
};
var getConversation = async (userId, conversationId) => {
  const conversation = await ensureConversationOwner(conversationId, userId);
  const messages = await prisma.aIChatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: aiMessageSelect
  });
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: messages.map(formatMessage)
  };
};
var updateMessageFeedback = async (userId, conversationId, messageId, feedback) => {
  await ensureConversationOwner(conversationId, userId);
  const message = await prisma.aIChatMessage.findFirst({
    where: {
      id: messageId,
      conversationId
    },
    select: aiMessageSelect
  });
  if (!message) {
    throw new AppError_default(httpStatus2.NOT_FOUND, "AI message not found");
  }
  if (message.role !== AIChatMessageRole.ASSISTANT) {
    throw new AppError_default(httpStatus2.BAD_REQUEST, "Only assistant messages can be rated");
  }
  const updated = await prisma.aIChatMessage.update({
    where: { id: messageId },
    data: { feedback },
    select: aiMessageSelect
  });
  return formatMessage(updated);
};
var aiChatService = {
  sendMessage,
  listConversations,
  getConversation,
  updateMessageFeedback
};

// src/modules/ai/controllers/aiChat.controller.ts
var sendMessage2 = catchAsync(async (req, res) => {
  const payload = sanitizeObject(req.body);
  const { data, meta } = await aiChatService.sendMessage(req.user.userId, {
    message: sanitizeText(payload.message, 4e3),
    context: payload.context ? sanitizeText(payload.context, 500) : void 0,
    conversationId: payload.conversationId
  });
  sendAIResponse(res, data, meta, httpStatus3.CREATED);
});
var listConversations2 = catchAsync(async (req, res) => {
  const data = await aiChatService.listConversations(req.user.userId);
  sendResponse(res, {
    httpStatusCode: httpStatus3.OK,
    success: true,
    message: "AI conversations fetched successfully",
    data
  });
});
var getConversation2 = catchAsync(async (req, res) => {
  const data = await aiChatService.getConversation(
    req.user.userId,
    String(req.params.conversationId)
  );
  sendResponse(res, {
    httpStatusCode: httpStatus3.OK,
    success: true,
    message: "AI conversation fetched successfully",
    data
  });
});
var updateMessageFeedback2 = catchAsync(async (req, res) => {
  const payload = sanitizeObject(req.body);
  const data = await aiChatService.updateMessageFeedback(
    req.user.userId,
    String(req.params.conversationId),
    String(req.params.messageId),
    payload.feedback ?? null
  );
  sendResponse(res, {
    httpStatusCode: httpStatus3.OK,
    success: true,
    message: "AI message feedback updated successfully",
    data
  });
});
var aiChatController = {
  sendMessage: sendMessage2,
  listConversations: listConversations2,
  getConversation: getConversation2,
  updateMessageFeedback: updateMessageFeedback2
};

// src/modules/ai/utils/metrics.ts
var stats = /* @__PURE__ */ new Map();
var startedAt = Date.now();
var getOrCreate2 = (endpoint) => {
  let s = stats.get(endpoint);
  if (!s) {
    s = {
      count: 0,
      errorCount: 0,
      totalLatencyMs: 0,
      totalTokens: 0,
      lastError: null,
      lastCallAt: null
    };
    stats.set(endpoint, s);
  }
  return s;
};
var aiMetrics = {
  recordSuccess(endpoint, latencyMs, tokensUsed = 0) {
    const s = getOrCreate2(endpoint);
    s.count += 1;
    s.totalLatencyMs += latencyMs;
    s.totalTokens += tokensUsed;
    s.lastCallAt = (/* @__PURE__ */ new Date()).toISOString();
  },
  recordError(endpoint, latencyMs, message) {
    const s = getOrCreate2(endpoint);
    s.count += 1;
    s.errorCount += 1;
    s.totalLatencyMs += latencyMs;
    s.lastError = { message, at: (/* @__PURE__ */ new Date()).toISOString() };
    s.lastCallAt = (/* @__PURE__ */ new Date()).toISOString();
  },
  snapshot() {
    const endpoints = {};
    for (const [key, s] of stats) {
      endpoints[key] = {
        count: s.count,
        errorCount: s.errorCount,
        avgLatencyMs: s.count > 0 ? Math.round(s.totalLatencyMs / s.count) : 0,
        totalTokens: s.totalTokens,
        lastError: s.lastError,
        lastCallAt: s.lastCallAt
      };
    }
    return {
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1e3),
      endpoints
    };
  }
};

// src/modules/ai/controllers/aiOps.controller.ts
var health = catchAsync(async (_req, res) => {
  const probe = await aiProvider.ping();
  const httpStatus4 = probe.status === "ok" ? 200 : probe.status === "unconfigured" ? 503 : 503;
  res.status(httpStatus4).json({
    success: probe.status === "ok",
    data: probe
  });
});
var metrics = catchAsync(async (_req, res) => {
  res.status(200).json({
    success: true,
    data: aiMetrics.snapshot()
  });
});
var aiOpsController = { health, metrics };

// src/modules/ai/schemas/ragOutput.schema.ts
import { z as z15 } from "zod";
var ragSourceSchema = z15.object({
  source_id: z15.string().min(1),
  evidence: z15.string().min(1)
});
var ragResponseSchema = z15.object({
  answer: z15.string().min(1),
  reasoning: z15.string().min(1),
  sources: z15.array(ragSourceSchema),
  suggestions: z15.array(z15.string().min(1)).max(5)
});

// src/modules/ai/utils/ragRanker.ts
var tokenize = (value) => value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 1);
var normalize = (value) => value.trim().toLowerCase();
var parseDateScore = (createdAtValue) => {
  if (typeof createdAtValue !== "string") return 0;
  const parsed = new Date(createdAtValue);
  if (Number.isNaN(parsed.valueOf())) return 0;
  const ageDays = Math.max(0, (Date.now() - parsed.valueOf()) / (1e3 * 60 * 60 * 24));
  if (ageDays <= 7) return 0.08;
  if (ageDays <= 30) return 0.05;
  if (ageDays <= 90) return 0.03;
  return 0;
};
var qualityScore = (metadata) => {
  if (!metadata) return 0;
  const rating = Number(metadata.rating ?? 0);
  const totalReviews = Number(metadata.totalReviews ?? 0);
  let score = 0;
  if (Number.isFinite(rating) && rating >= 4.5) score += 0.06;
  else if (Number.isFinite(rating) && rating >= 4) score += 0.03;
  if (Number.isFinite(totalReviews) && totalReviews >= 100) score += 0.05;
  else if (Number.isFinite(totalReviews) && totalReviews >= 20) score += 0.03;
  score += parseDateScore(metadata.createdAt);
  return Math.min(0.15, score);
};
var rankRagContext = (query2, context, topK = 6) => {
  const normalizedQuery = normalize(query2);
  const queryTokens = tokenize(query2);
  const tokenSet = new Set(queryTokens);
  const ranked = context.filter((item) => item.source_id?.trim() && item.content?.trim()).map((item) => {
    const text = normalize(item.content);
    const textTokens = tokenize(text);
    const textTokenSet = new Set(textTokens);
    const exactPhraseMatch = normalizedQuery.length > 2 && text.includes(normalizedQuery) ? 1 : 0;
    let overlapCount = 0;
    for (const token of tokenSet) {
      if (textTokenSet.has(token)) overlapCount += 1;
    }
    const overlapScore = tokenSet.size > 0 ? overlapCount / tokenSet.size : 0;
    const lengthPenalty = text.length > 4e3 ? 0.05 : 0;
    const score = exactPhraseMatch * 0.6 + overlapScore * 0.4 + qualityScore(item.metadata) - lengthPenalty;
    return {
      ...item,
      score: Math.max(0, Math.min(1, Number(score.toFixed(4))))
    };
  }).sort((a, b) => b.score - a.score).slice(0, Math.max(1, topK));
  return ranked;
};

// src/modules/ai/services/aiRag.service.ts
var NO_MATCH = "No matching data found in the system.";
var buildPrompt = (query2, context) => {
  return [
    "You are the RAG engine for ConsultEdge.",
    "Answer ONLY using the data provided below.",
    "Never hallucinate or invent experts, industries, reviews, or policies.",
    `If answer not present, answer must be exactly: "${NO_MATCH}".`,
    "Rules:",
    "1) Use only retrieved context.",
    "2) Do not guess missing information.",
    "3) If multiple experts match, rank by relevance.",
    "4) If user intent is unclear, ask a clarifying question in suggestions.",
    "5) Keep answer clear and professional.",
    "6) Include why this answer in reasoning.",
    "7) Include citations using source_id values from context.",
    "Output JSON with shape:",
    '{"answer":"...","reasoning":"...","sources":[{"source_id":"...","evidence":"..."}],"suggestions":["..."]}',
    "Context:",
    JSON.stringify(context),
    "Query:",
    query2
  ].join("\n");
};
var aiRagService = {
  async query(input) {
    const ranked = rankRagContext(input.query, input.context, input.topK ?? 6);
    if (ranked.length === 0 || ranked[0].score < 0.08) {
      return {
        data: {
          answer: NO_MATCH,
          reasoning: "No relevant evidence matched the query in retrieved context.",
          sources: [],
          suggestions: [
            "Try refining the query with specific industry, expert name, or title.",
            "Increase retrieval depth and rerun the query."
          ]
        },
        meta: {
          model: "heuristic",
          provider: "fallback",
          tokensUsed: 0,
          latencyMs: 0
        }
      };
    }
    const { data, meta } = await aiProvider.generateJSON({
      messages: [
        {
          role: "system",
          content: "You are a strict retrieval-grounded JSON API. Never output non-JSON."
        },
        {
          role: "user",
          content: buildPrompt(input.query, ranked)
        }
      ],
      temperature: 0.1,
      maxTokens: 900
    });
    const parsed = ragResponseSchema.safeParse(data);
    if (!parsed.success) {
      return {
        data: {
          answer: NO_MATCH,
          reasoning: "Model response was invalid against RAG schema.",
          sources: [],
          suggestions: [
            "Retry query with narrower intent.",
            "Check retrieved context quality and source_id fields."
          ]
        },
        meta: {
          model: meta.model,
          provider: meta.provider,
          tokensUsed: meta.tokensUsed,
          latencyMs: meta.latencyMs
        }
      };
    }
    return {
      data: parsed.data,
      meta: {
        model: meta.model,
        provider: meta.provider,
        tokensUsed: meta.tokensUsed,
        latencyMs: meta.latencyMs
      }
    };
  }
};

// src/modules/ai/controllers/aiRag.controller.ts
var query = catchAsync(async (req, res) => {
  const payload = req.body;
  const result = await aiRagService.query(payload);
  sendAIResponse(res, result.data, result.meta);
});
var aiRagController = {
  query
};

// src/modules/ai/ai.validation.ts
import { z as z16 } from "zod";
var historyItemSchema = z16.object({
  role: z16.enum(["user", "assistant"]),
  content: z16.string().trim().min(1).max(4e3)
});
var askSupport3 = z16.object({
  body: z16.object({
    message: z16.string().trim().min(1, "Message is required").max(4e3),
    context: z16.enum(["general", "homepage", "booking", "expert", "payment", "technical"]).optional(),
    history: z16.array(historyItemSchema).max(12).optional()
  })
});
var expertItem = z16.object({
  id: z16.string().min(1),
  name: z16.string().min(1).max(200),
  industry: z16.string().max(120).optional(),
  expertise: z16.array(z16.string().max(80)).max(20).optional(),
  bio: z16.string().max(2e3).optional(),
  rating: z16.number().min(0).max(5).optional()
});
var recommendations3 = z16.object({
  body: z16.object({
    viewedExperts: z16.array(z16.string().max(200)).max(100).optional(),
    exploredIndustries: z16.array(z16.string().max(120)).max(100).optional(),
    searchHistory: z16.array(z16.string().max(200)).max(100).optional(),
    clickedCategories: z16.array(z16.string().max(120)).max(100).optional()
  })
});
var industryCreation3 = z16.object({
  body: z16.object({
    industryName: z16.string().trim().min(2).max(100)
  })
});
var search3 = z16.object({
  body: z16.object({
    query: z16.string().trim().min(1).max(500),
    userActivity: z16.object({
      viewedExperts: z16.array(z16.string().max(200)).max(100).optional(),
      exploredIndustries: z16.array(z16.string().max(120)).max(100).optional(),
      searchHistory: z16.array(z16.string().max(200)).max(100).optional(),
      clickedCategories: z16.array(z16.string().max(120)).max(100).optional()
    }).optional(),
    db: z16.object({
      experts: z16.array(expertItem).max(300).optional(),
      industries: z16.array(z16.record(z16.string(), z16.unknown())).max(300).optional(),
      testimonials: z16.array(z16.record(z16.string(), z16.unknown())).max(500).optional(),
      trending: z16.array(z16.record(z16.string(), z16.unknown())).max(200).optional()
    }).optional()
  })
});
var summary3 = z16.object({
  body: z16.object({
    text: z16.string().trim().min(20).max(2e4),
    audience: z16.string().max(100).optional()
  })
});
var chat3 = z16.object({
  body: z16.object({
    message: z16.string().trim().min(1).max(4e3),
    context: z16.string().max(500).optional(),
    history: z16.array(historyItemSchema).max(20).optional()
  })
});
var persistedChatMessage = z16.object({
  body: z16.object({
    message: z16.string().trim().min(1).max(4e3),
    context: z16.string().max(500).optional(),
    conversationId: z16.string().uuid().optional()
  })
});
var conversationParams = z16.object({
  params: z16.object({
    conversationId: z16.string().uuid()
  })
});
var messageFeedback = z16.object({
  params: z16.object({
    conversationId: z16.string().uuid(),
    messageId: z16.string().uuid()
  }),
  body: z16.object({
    feedback: z16.enum(["LIKE", "DISLIKE"]).nullable()
  })
});
var ragQuery = z16.object({
  body: z16.object({
    query: z16.string().trim().min(1).max(1e3),
    topK: z16.coerce.number().int().min(1).max(20).optional(),
    context: z16.array(
      z16.object({
        source_id: z16.string().trim().min(1).max(200),
        content: z16.string().trim().min(1).max(12e3),
        metadata: z16.record(z16.string(), z16.unknown()).optional()
      })
    ).min(1).max(100)
  })
});
var documentAnalysis3 = z16.object({
  body: z16.object({
    text: z16.string().trim().min(50).max(4e4),
    objective: z16.string().max(500).optional()
  })
});
var aiValidation = {
  askSupport: askSupport3,
  recommendations: recommendations3,
  industryCreation: industryCreation3,
  search: search3,
  summary: summary3,
  chat: chat3,
  persistedChatMessage,
  conversationParams,
  messageFeedback,
  ragQuery,
  documentAnalysis: documentAnalysis3
};

// src/modules/ai/utils/aiLogger.ts
var aiLogger = (req, res, next) => {
  const startedAt2 = Date.now();
  const endpoint = req.path || req.originalUrl;
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt2;
    const meta = res.locals.aiMeta ?? null;
    const ok2 = res.statusCode < 400;
    if (ok2) {
      aiMetrics.recordSuccess(endpoint, durationMs, meta?.tokensUsed ?? 0);
    } else {
      aiMetrics.recordError(endpoint, durationMs, `HTTP ${res.statusCode}`);
    }
    console.log(
      JSON.stringify({
        scope: "ai",
        endpoint,
        method: req.method,
        status: res.statusCode,
        durationMs,
        provider: meta?.provider ?? null,
        model: meta?.model ?? null,
        tokensUsed: meta?.tokensUsed ?? 0,
        modelLatencyMs: meta?.latencyMs ?? null,
        at: (/* @__PURE__ */ new Date()).toISOString()
      })
    );
  });
  next();
};

// src/modules/ai/utils/rateLimiter.ts
var buckets = /* @__PURE__ */ new Map();
var getClientKey = (req) => {
  const userId = req.user?.id;
  if (userId) return `u:${userId}`;
  const xff = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(xff) ? xff[0] : xff?.split(",")[0]?.trim()) || req.ip || "unknown";
  return `ip:${ip}`;
};
var rateLimit2 = (options) => {
  const { windowMs, max, keyPrefix = "ai" } = options;
  return (req, res, next) => {
    const key = `${keyPrefix}:${getClientKey(req)}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(max - 1));
      return next();
    }
    if (bucket.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1e3));
      res.setHeader("Retry-After", String(retryAfterSec));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded",
        retryAfter: retryAfterSec
      });
    }
    bucket.count += 1;
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(max - bucket.count));
    next();
  };
};
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}, 6e4).unref?.();

// src/modules/ai/utils/aiErrorHandler.ts
import status40 from "http-status";
var aiErrorHandler = (err, _req, res, next) => {
  if (err instanceof AppError_default && err.statusCode === status40.SERVICE_UNAVAILABLE) {
    return res.status(503).json({
      success: false,
      message: "AI provider unavailable",
      detail: err.message
    });
  }
  if (err instanceof AppError_default && err.statusCode === status40.BAD_GATEWAY) {
    return res.status(503).json({
      success: false,
      message: "AI provider unavailable",
      detail: err.message
    });
  }
  return next(err);
};

// src/modules/ai/ai.router.ts
var router19 = Router19();
router19.use(aiLogger);
var recommendationsLimiter = rateLimit2({ windowMs: 6e4, max: 10, keyPrefix: "ai-rec" });
var industryCreationLimiter = rateLimit2({ windowMs: 6e4, max: 10, keyPrefix: "ai-industry" });
var searchLimiter = rateLimit2({ windowMs: 6e4, max: 15, keyPrefix: "ai-search" });
var summaryLimiter = rateLimit2({ windowMs: 6e4, max: 5, keyPrefix: "ai-summary" });
var chatLimiter = rateLimit2({ windowMs: 6e4, max: 20, keyPrefix: "ai-chat" });
var docLimiter = rateLimit2({ windowMs: 6e4, max: 3, keyPrefix: "ai-doc" });
var supportLimiter = rateLimit2({ windowMs: 6e4, max: 30, keyPrefix: "ai-support" });
router19.get("/health", aiOpsController.health);
router19.get("/metrics", aiOpsController.metrics);
router19.post(
  "/support",
  supportLimiter,
  validateRequest(aiValidation.askSupport),
  aiController.askSupport
);
router19.post(
  "/recommendations",
  recommendationsLimiter,
  validateRequest(aiValidation.recommendations),
  aiAdvancedController.recommendations
);
router19.post(
  "/industry-creation",
  industryCreationLimiter,
  validateRequest(aiValidation.industryCreation),
  aiAdvancedController.industryCreation
);
router19.post(
  "/search",
  searchLimiter,
  validateRequest(aiValidation.search),
  aiAdvancedController.search
);
router19.post(
  "/summary",
  summaryLimiter,
  validateRequest(aiValidation.summary),
  aiAdvancedController.summary
);
router19.post(
  "/chat",
  chatLimiter,
  validateRequest(aiValidation.chat),
  aiAdvancedController.chat
);
router19.post(
  "/chat/messages",
  chatLimiter,
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  validateRequest(aiValidation.persistedChatMessage),
  aiChatController.sendMessage
);
router19.get(
  "/chat/conversations",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  aiChatController.listConversations
);
router19.get(
  "/chat/conversations/:conversationId",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  validateRequest(aiValidation.conversationParams),
  aiChatController.getConversation
);
router19.patch(
  "/chat/conversations/:conversationId/messages/:messageId/feedback",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  validateRequest(aiValidation.messageFeedback),
  aiChatController.updateMessageFeedback
);
router19.post(
  "/document-analysis",
  docLimiter,
  validateRequest(aiValidation.documentAnalysis),
  aiAdvancedController.documentAnalysis
);
router19.post(
  "/rag/query",
  searchLimiter,
  validateRequest(aiValidation.ragQuery),
  aiRagController.query
);
router19.use(aiErrorHandler);
var aiRoutes = router19;

// src/modules/coupon/coupon.router.ts
import { Router as Router20 } from "express";

// src/modules/coupon/coupon.controller.ts
import status41 from "http-status";
var validateCoupon2 = catchAsync(async (req, res) => {
  const { code, amount } = req.body;
  const preview = await couponService.validateCoupon(code, Number(amount));
  sendResponse(res, {
    httpStatusCode: status41.OK,
    success: true,
    message: "Coupon is valid",
    data: preview
  });
});
var createCoupon2 = catchAsync(async (req, res) => {
  const coupon = await couponService.createCoupon(req.body);
  sendResponse(res, {
    httpStatusCode: status41.CREATED,
    success: true,
    message: "Coupon created",
    data: coupon
  });
});
var listCoupons2 = catchAsync(async (req, res) => {
  const result = await couponService.listCoupons(req.query);
  sendResponse(res, {
    httpStatusCode: status41.OK,
    success: true,
    message: "Coupons fetched",
    data: result.data,
    meta: result.meta
  });
});
var getCouponById2 = catchAsync(async (req, res) => {
  const coupon = await couponService.getCouponById(req.params.id);
  sendResponse(res, {
    httpStatusCode: status41.OK,
    success: true,
    message: "Coupon fetched",
    data: coupon
  });
});
var updateCoupon2 = catchAsync(async (req, res) => {
  const coupon = await couponService.updateCoupon(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status41.OK,
    success: true,
    message: "Coupon updated",
    data: coupon
  });
});
var deleteCoupon2 = catchAsync(async (req, res) => {
  const coupon = await couponService.deleteCoupon(req.params.id);
  sendResponse(res, {
    httpStatusCode: status41.OK,
    success: true,
    message: "Coupon deleted",
    data: coupon
  });
});
var couponController = {
  validateCoupon: validateCoupon2,
  createCoupon: createCoupon2,
  listCoupons: listCoupons2,
  getCouponById: getCouponById2,
  updateCoupon: updateCoupon2,
  deleteCoupon: deleteCoupon2
};

// src/modules/coupon/coupon.validation.ts
import z17 from "zod";
var validateCouponValidation = z17.object({
  body: z17.object({
    code: z17.string().trim().min(1, "Coupon code is required"),
    amount: z17.coerce.number().positive("Amount must be positive")
  })
});
var createCouponValidation = z17.object({
  body: z17.object({
    code: z17.string().trim().min(2).max(40),
    description: z17.string().trim().max(200).optional(),
    discountType: z17.nativeEnum(CouponDiscountType),
    discountValue: z17.coerce.number().positive(),
    maxDiscount: z17.coerce.number().positive().optional(),
    minAmount: z17.coerce.number().nonnegative().optional(),
    expiresAt: z17.string().datetime().optional(),
    maxUses: z17.coerce.number().int().positive().optional(),
    isActive: z17.boolean().optional()
  })
});
var updateCouponValidation = z17.object({
  params: z17.object({ id: z17.string().uuid() }),
  body: z17.object({
    code: z17.string().trim().min(2).max(40).optional(),
    description: z17.string().trim().max(200).nullable().optional(),
    discountType: z17.nativeEnum(CouponDiscountType).optional(),
    discountValue: z17.coerce.number().positive().optional(),
    maxDiscount: z17.coerce.number().positive().nullable().optional(),
    minAmount: z17.coerce.number().nonnegative().nullable().optional(),
    expiresAt: z17.string().datetime().nullable().optional(),
    maxUses: z17.coerce.number().int().positive().nullable().optional(),
    isActive: z17.boolean().optional()
  })
});
var couponIdParamValidation = z17.object({
  params: z17.object({ id: z17.string().uuid() })
});

// src/modules/coupon/coupon.router.ts
var router20 = Router20();
router20.post(
  "/validate",
  validateRequest(validateCouponValidation),
  couponController.validateCoupon
);
router20.post(
  "/",
  checkAuth(Role.ADMIN),
  validateRequest(createCouponValidation),
  couponController.createCoupon
);
router20.get("/", checkAuth(Role.ADMIN), couponController.listCoupons);
router20.get(
  "/:id",
  checkAuth(Role.ADMIN),
  validateRequest(couponIdParamValidation),
  couponController.getCouponById
);
router20.patch(
  "/:id",
  checkAuth(Role.ADMIN),
  validateRequest(updateCouponValidation),
  couponController.updateCoupon
);
router20.delete(
  "/:id",
  checkAuth(Role.ADMIN),
  validateRequest(couponIdParamValidation),
  couponController.deleteCoupon
);
var couponRouter = router20;

// src/modules/refund/refund.router.ts
import { Router as Router21 } from "express";

// src/modules/refund/refund.controler.ts
import status43 from "http-status";

// src/modules/refund/refund.service.ts
import status42 from "http-status";
import Stripe2 from "stripe";
var stripeKey2 = envVars.STRIPE.STRIPE_SECRET_KEY;
var stripe2 = stripeKey2 ? new Stripe2(stripeKey2) : null;
var generateRefundNumber = () => {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const rand = Math.floor(1e5 + Math.random() * 9e5);
  return `RF-${year}-${rand}`;
};
var requestRefund = async (userId, payload) => {
  const order = await prisma.order.findFirst({
    where: { id: payload.orderId, userId },
    include: { items: true, sellerOrders: true }
  });
  if (!order) throw new AppError_default(status42.NOT_FOUND, "Order not found");
  if (order.paymentStatus !== PaymentStatus.PAID) {
    throw new AppError_default(
      status42.BAD_REQUEST,
      "Only paid orders are eligible for refund"
    );
  }
  const itemMap = new Map(order.items.map((i) => [i.id, i]));
  let amount = 0;
  let sellerId = null;
  for (const it of payload.items) {
    const oi = itemMap.get(it.orderItemId);
    if (!oi) {
      throw new AppError_default(
        status42.BAD_REQUEST,
        `Order item ${it.orderItemId} is not part of this order`
      );
    }
    if (it.quantity > oi.quantity) {
      throw new AppError_default(
        status42.BAD_REQUEST,
        `Quantity exceeds ordered amount for ${oi.productName}`
      );
    }
    if (payload.sellerOrderId && oi.sellerOrderId !== payload.sellerOrderId) {
      throw new AppError_default(
        status42.BAD_REQUEST,
        "Item does not belong to the supplied seller-order"
      );
    }
    sellerId = oi.sellerId;
    amount += toNumber(oi.unitPrice) * it.quantity;
  }
  amount = round2(amount);
  const refund = await prisma.$transaction(async (tx) => {
    const created = await tx.refund.create({
      data: {
        refundNumber: generateRefundNumber(),
        orderId: order.id,
        sellerOrderId: payload.sellerOrderId ?? null,
        sellerId,
        requestedById: userId,
        status: RefundStatus.REQUESTED,
        reason: payload.reason,
        customerNote: payload.customerNote,
        currency: order.currency,
        requestedAmount: amount,
        items: {
          create: payload.items.map((it) => {
            const oi = itemMap.get(it.orderItemId);
            return {
              orderItemId: oi.id,
              quantity: it.quantity,
              amount: round2(toNumber(oi.unitPrice) * it.quantity)
            };
          })
        }
      },
      include: { items: true }
    });
    if (payload.sellerOrderId) {
      await tx.sellerOrder.update({
        where: { id: payload.sellerOrderId },
        data: { status: SellerOrderStatus.RETURN_REQUESTED }
      });
    } else {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.RETURN_REQUESTED }
      });
    }
    return created;
  });
  if (sellerId) {
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { userId: true, shopName: true }
    });
    if (seller) {
      await notificationService.createNotification({
        userId: seller.userId,
        type: NotificationType.REFUND_REQUESTED,
        title: "Refund requested",
        message: `A customer has requested a refund of ${order.currency} ${amount.toFixed(2)} on order ${order.orderNumber}.`,
        actionUrl: `/seller/refunds/${refund.id}`,
        metadata: { refundId: refund.id, orderId: order.id }
      }).catch(() => null);
    }
  }
  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN, isDeleted: false },
    select: { id: true }
  });
  if (admins.length) {
    await notificationService.createNotificationsForUsers(
      admins.map((a) => a.id),
      {
        type: NotificationType.REFUND_REQUESTED,
        title: "Refund requested",
        message: `Refund #${refund.refundNumber} for order ${order.orderNumber} (${order.currency} ${amount.toFixed(2)}).`,
        actionUrl: `/admin/refunds/${refund.id}`,
        metadata: { refundId: refund.id }
      }
    ).catch(() => null);
  }
  return refund;
};
var approveRefund = async (refundId, actor, payload) => {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { order: true }
  });
  if (!refund) throw new AppError_default(status42.NOT_FOUND, "Refund not found");
  if (refund.status !== RefundStatus.REQUESTED) {
    throw new AppError_default(
      status42.BAD_REQUEST,
      `Refund is already ${refund.status}`
    );
  }
  if (actor.role === Role.SELLER) {
    if (!refund.sellerId) {
      throw new AppError_default(status42.FORBIDDEN, "Order-wide refund requires admin");
    }
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true }
    });
    if (!seller || seller.id !== refund.sellerId) {
      throw new AppError_default(status42.FORBIDDEN, "Not your refund to approve");
    }
  }
  const approvedAmount = round2(
    payload.approvedAmount ?? toNumber(refund.requestedAmount)
  );
  const updated = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: RefundStatus.APPROVED,
      approvedAmount,
      decidedById: actor.userId,
      decidedAt: /* @__PURE__ */ new Date(),
      decisionNote: payload.decisionNote
    }
  });
  await notificationService.createNotification({
    userId: refund.requestedById,
    type: NotificationType.REFUND_APPROVED,
    title: "Refund approved",
    message: `Your refund #${refund.refundNumber} was approved for ${refund.currency} ${approvedAmount.toFixed(2)}. Processing payment...`,
    actionUrl: `/account/refunds/${refund.id}`,
    metadata: { refundId }
  }).catch(() => null);
  void processRefund(refundId).catch(() => null);
  return updated;
};
var rejectRefund = async (refundId, actor, payload) => {
  const refund = await prisma.refund.findUnique({ where: { id: refundId } });
  if (!refund) throw new AppError_default(status42.NOT_FOUND, "Refund not found");
  if (refund.status !== RefundStatus.REQUESTED) {
    throw new AppError_default(status42.BAD_REQUEST, `Refund is already ${refund.status}`);
  }
  if (actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true }
    });
    if (!seller || seller.id !== refund.sellerId) {
      throw new AppError_default(status42.FORBIDDEN, "Not your refund to reject");
    }
  }
  const updated = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: RefundStatus.REJECTED,
      decidedById: actor.userId,
      decidedAt: /* @__PURE__ */ new Date(),
      decisionNote: payload.decisionNote
    }
  });
  await notificationService.createNotification({
    userId: refund.requestedById,
    type: NotificationType.REFUND_REJECTED,
    title: "Refund rejected",
    message: `Your refund #${refund.refundNumber} was not approved.${payload.decisionNote ? ` Reason: ${payload.decisionNote}` : ""}`,
    actionUrl: `/account/refunds/${refund.id}`,
    metadata: { refundId }
  }).catch(() => null);
  return updated;
};
var processRefund = async (refundId) => {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: {
      order: { include: { payments: true } }
    }
  });
  if (!refund) throw new AppError_default(status42.NOT_FOUND, "Refund not found");
  if (refund.status !== RefundStatus.APPROVED && refund.status !== RefundStatus.PROCESSING) {
    throw new AppError_default(
      status42.BAD_REQUEST,
      `Cannot process a refund in status ${refund.status}`
    );
  }
  const approvedAmount = round2(
    toNumber(refund.approvedAmount ?? refund.requestedAmount)
  );
  await prisma.refund.update({
    where: { id: refundId },
    data: { status: RefundStatus.PROCESSING }
  });
  const stripePayment = refund.order.payments.find(
    (p) => p.stripePaymentIntentId && p.status === PaymentStatus.PAID
  );
  let stripeRefundId = null;
  let stripeChargeId = null;
  try {
    if (stripe2 && stripePayment?.stripePaymentIntentId) {
      const r = await stripe2.refunds.create({
        payment_intent: stripePayment.stripePaymentIntentId,
        amount: Math.round(approvedAmount * 100),
        reason: "requested_by_customer",
        metadata: {
          refundId: refund.id,
          orderId: refund.orderId,
          orderNumber: refund.order.orderNumber
        }
      });
      stripeRefundId = r.id;
      stripeChargeId = r.charge || null;
    }
  } catch (err) {
    await prisma.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.FAILED, decisionNote: err?.message }
    });
    throw new AppError_default(
      status42.BAD_GATEWAY,
      `Stripe refund failed: ${err?.message ?? "unknown error"}`
    );
  }
  const completed = await prisma.$transaction(async (tx) => {
    const updated = await tx.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.COMPLETED,
        refundedAmount: approvedAmount,
        stripeRefundId,
        stripeChargeId,
        completedAt: /* @__PURE__ */ new Date()
      }
    });
    if (stripePayment) {
      const newRefunded = round2(
        toNumber(stripePayment.refundedAmount) + approvedAmount
      );
      const fullyRefunded = newRefunded >= toNumber(stripePayment.amount);
      await tx.payment.update({
        where: { id: stripePayment.id },
        data: {
          refundedAmount: newRefunded,
          status: fullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
          refundedAt: /* @__PURE__ */ new Date()
        }
      });
    }
    const order = await tx.order.findUnique({
      where: { id: refund.orderId },
      select: { grandTotal: true }
    });
    if (order) {
      const totalRefunded = await tx.refund.aggregate({
        where: {
          orderId: refund.orderId,
          status: RefundStatus.COMPLETED
        },
        _sum: { refundedAmount: true }
      });
      const refundedSum = toNumber(totalRefunded._sum.refundedAmount ?? 0);
      const fully = refundedSum >= toNumber(order.grandTotal);
      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          paymentStatus: fully ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
          status: fully ? OrderStatus.REFUNDED : OrderStatus.RETURNED
        }
      });
    }
    if (refund.sellerOrderId) {
      await tx.sellerOrder.update({
        where: { id: refund.sellerOrderId },
        data: { status: SellerOrderStatus.REFUNDED }
      });
      await tx.sellerPayoutItem.updateMany({
        where: { sellerOrderId: refund.sellerOrderId },
        data: { refundAmount: { increment: approvedAmount } }
      });
    }
    return updated;
  });
  await notificationService.createNotification({
    userId: refund.requestedById,
    type: NotificationType.REFUND_COMPLETED,
    title: "Refund completed",
    message: `${refund.currency} ${approvedAmount.toFixed(2)} has been refunded for order ${refund.order.orderNumber}.`,
    actionUrl: `/account/refunds/${refund.id}`,
    metadata: { refundId }
  }).catch(() => null);
  return completed;
};
var listMine6 = async (userId, query2) => {
  const page = Math.max(1, Number(query2.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query2.limit) || 10));
  const where = { requestedById: userId };
  if (query2.status) where.status = query2.status;
  const [data, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { items: true, order: { select: { orderNumber: true } } }
    }),
    prisma.refund.count({ where })
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};
var listForSeller = async (userId, query2) => {
  const seller = await prisma.seller.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (!seller) throw new AppError_default(status42.FORBIDDEN, "Not a seller");
  const page = Math.max(1, Number(query2.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query2.limit) || 10));
  const where = { sellerId: seller.id };
  if (query2.status) where.status = query2.status;
  const [data, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        items: true,
        order: { select: { orderNumber: true } },
        requestedBy: { select: { id: true, name: true, email: true } }
      }
    }),
    prisma.refund.count({ where })
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};
var listAll7 = async (query2) => {
  const page = Math.max(1, Number(query2.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query2.limit) || 20));
  const where = {};
  if (query2.status) where.status = query2.status;
  if (query2.sellerId) where.sellerId = query2.sellerId;
  const [data, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        items: true,
        order: { select: { orderNumber: true } },
        requestedBy: { select: { id: true, name: true, email: true } }
      }
    }),
    prisma.refund.count({ where })
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};
var getById8 = async (id, actor) => {
  const refund = await prisma.refund.findUnique({
    where: { id },
    include: {
      items: { include: { orderItem: true } },
      order: true,
      sellerOrder: true,
      requestedBy: { select: { id: true, name: true, email: true } },
      decidedBy: { select: { id: true, name: true, email: true } }
    }
  });
  if (!refund) throw new AppError_default(status42.NOT_FOUND, "Refund not found");
  if (actor.role === Role.CUSTOMER && refund.requestedById !== actor.userId) {
    throw new AppError_default(status42.FORBIDDEN, "Not your refund");
  }
  if (actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true }
    });
    if (!seller || seller.id !== refund.sellerId) {
      throw new AppError_default(status42.FORBIDDEN, "Not your refund");
    }
  }
  return refund;
};
var refundService = {
  requestRefund,
  approveRefund,
  rejectRefund,
  processRefund,
  listMine: listMine6,
  listForSeller,
  listAll: listAll7,
  getById: getById8
};

// src/modules/refund/refund.controler.ts
var request = catchAsync(async (req, res) => {
  const result = await refundService.requestRefund(req.user.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status43.CREATED,
    success: true,
    message: "Refund requested",
    data: result
  });
});
var approve = catchAsync(async (req, res) => {
  const result = await refundService.approveRefund(
    req.params.id,
    { userId: req.user.userId, role: req.user.role },
    req.body ?? {}
  );
  sendResponse(res, {
    httpStatusCode: status43.OK,
    success: true,
    message: "Refund approved \u2014 processing",
    data: result
  });
});
var reject = catchAsync(async (req, res) => {
  const result = await refundService.rejectRefund(
    req.params.id,
    { userId: req.user.userId, role: req.user.role },
    req.body ?? {}
  );
  sendResponse(res, {
    httpStatusCode: status43.OK,
    success: true,
    message: "Refund rejected",
    data: result
  });
});
var reprocess = catchAsync(async (req, res) => {
  const result = await refundService.processRefund(req.params.id);
  sendResponse(res, {
    httpStatusCode: status43.OK,
    success: true,
    message: "Refund processed",
    data: result
  });
});
var listMine7 = catchAsync(async (req, res) => {
  const result = await refundService.listMine(req.user.userId, req.query);
  sendResponse(res, {
    httpStatusCode: status43.OK,
    success: true,
    message: "Refunds fetched",
    data: result.data,
    meta: result.meta
  });
});
var listSeller = catchAsync(async (req, res) => {
  const result = await refundService.listForSeller(req.user.userId, req.query);
  sendResponse(res, {
    httpStatusCode: status43.OK,
    success: true,
    message: "Seller refunds fetched",
    data: result.data,
    meta: result.meta
  });
});
var listAll8 = catchAsync(async (req, res) => {
  const result = await refundService.listAll(req.query);
  sendResponse(res, {
    httpStatusCode: status43.OK,
    success: true,
    message: "Refunds fetched",
    data: result.data,
    meta: result.meta
  });
});
var getById9 = catchAsync(async (req, res) => {
  const result = await refundService.getById(req.params.id, {
    userId: req.user.userId,
    role: req.user.role
  });
  sendResponse(res, {
    httpStatusCode: status43.OK,
    success: true,
    message: "Refund fetched",
    data: result
  });
});
var refundController = {
  request,
  approve,
  reject,
  reprocess,
  listMine: listMine7,
  listSeller,
  listAll: listAll8,
  getById: getById9
};

// src/modules/refund/refund.validation.ts
import { z as z18 } from "zod";
var RefundReasonEnum = z18.enum([
  "DAMAGED",
  "DEFECTIVE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NO_LONGER_NEEDED",
  "LATE_DELIVERY",
  "OTHER"
]);
var requestRefundSchema = z18.object({
  orderId: z18.string().uuid(),
  sellerOrderId: z18.string().uuid().optional(),
  reason: RefundReasonEnum,
  customerNote: z18.string().max(2e3).optional(),
  items: z18.array(
    z18.object({
      orderItemId: z18.string().uuid(),
      quantity: z18.number().int().positive()
    })
  ).min(1)
});
var decideRefundSchema = z18.object({
  approvedAmount: z18.number().nonnegative().optional(),
  decisionNote: z18.string().max(2e3).optional()
});

// src/modules/refund/refund.router.ts
var router21 = Router21();
router21.post(
  "/",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  validateRequest(requestRefundSchema),
  refundController.request
);
router21.get(
  "/me",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  refundController.listMine
);
router21.get(
  "/seller",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  refundController.listSeller
);
router21.get(
  "/admin",
  checkAuth(Role.ADMIN, Role.STAFF),
  refundController.listAll
);
router21.get(
  "/:id",
  checkAuth(Role.CUSTOMER, Role.SELLER, Role.ADMIN, Role.STAFF),
  refundController.getById
);
router21.patch(
  "/:id/approve",
  checkAuth(Role.SELLER, Role.ADMIN),
  validateRequest(decideRefundSchema),
  refundController.approve
);
router21.patch(
  "/:id/reject",
  checkAuth(Role.SELLER, Role.ADMIN),
  validateRequest(decideRefundSchema),
  refundController.reject
);
router21.post(
  "/:id/process",
  checkAuth(Role.ADMIN),
  refundController.reprocess
);
var refundRouter = router21;

// src/modules/stripeConnect/stripeConnect.router.ts
import { Router as Router22 } from "express";

// src/modules/stripeConnect/stripeConnect.controler.ts
import status44 from "http-status";
var createOnboardingLink = catchAsync(async (req, res) => {
  const result = await stripeConnectService.createOnboardingLink(
    req.user.userId,
    req.body ?? {}
  );
  sendResponse(res, {
    httpStatusCode: status44.OK,
    success: true,
    message: "Stripe onboarding link created",
    data: result
  });
});
var refreshStatus = catchAsync(async (req, res) => {
  const result = await stripeConnectService.refreshStatus(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status44.OK,
    success: true,
    message: "Stripe Connect status refreshed",
    data: result
  });
});
var loginLink = catchAsync(async (req, res) => {
  const result = await stripeConnectService.createLoginLink(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status44.OK,
    success: true,
    message: "Stripe dashboard login link",
    data: result
  });
});
var transferPayout = catchAsync(async (req, res) => {
  const result = await stripeConnectService.transferPayout(req.params.id);
  sendResponse(res, {
    httpStatusCode: status44.OK,
    success: true,
    message: "Stripe transfer initiated",
    data: result
  });
});
var stripeConnectController = {
  createOnboardingLink,
  refreshStatus,
  loginLink,
  transferPayout
};

// src/modules/stripeConnect/stripeConnect.router.ts
var router22 = Router22();
router22.post(
  "/sellers/me/onboarding-link",
  checkAuth(Role.SELLER, Role.ADMIN),
  stripeConnectController.createOnboardingLink
);
router22.get(
  "/sellers/me/status",
  checkAuth(Role.SELLER, Role.ADMIN),
  stripeConnectController.refreshStatus
);
router22.get(
  "/sellers/me/login-link",
  checkAuth(Role.SELLER, Role.ADMIN),
  stripeConnectController.loginLink
);
router22.post(
  "/payouts/:id/transfer",
  checkAuth(Role.ADMIN),
  stripeConnectController.transferPayout
);
var stripeConnectRouter = router22;

// src/modules/inventory/inventory.router.ts
import { Router as Router23 } from "express";

// src/modules/inventory/inventory.controler.ts
import { z as z19 } from "zod";
import status46 from "http-status";

// src/modules/inventory/inventory.service.ts
import status45 from "http-status";
var resolveSellerScope = async (actor) => {
  if (actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true }
    });
    if (!seller) throw new AppError_default(status45.FORBIDDEN, "Not a seller");
    return seller.id;
  }
  return null;
};
var listLowStock = async (actor, query2) => {
  const sellerId = await resolveSellerScope(actor);
  const page = Math.max(1, Number(query2.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query2.limit) || 20));
  const filter = sellerId ? `AND p."sellerId" = $1::uuid` : "";
  const params = sellerId ? [sellerId] : [];
  const rows = await prisma.$queryRawUnsafe(
    `SELECT p.id FROM products p
     WHERE p."isDeleted" = false
       AND p."trackInventory" = true
       AND p."stock" <= p."lowStockAlert"
       ${filter}
     ORDER BY p."stock" ASC, p."createdAt" DESC
     LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
    ...params
  );
  const ids = rows.map((r) => r.id);
  const data = ids.length ? await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      price: true,
      currency: true,
      stock: true,
      lowStockAlert: true,
      status: true,
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      seller: {
        select: { id: true, shopName: true, shopSlug: true }
      }
    }
  }) : [];
  const orderMap = new Map(ids.map((id, idx) => [id, idx]));
  data.sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  );
  const totalRow = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::bigint AS count FROM products p
     WHERE p."isDeleted" = false
       AND p."trackInventory" = true
       AND p."stock" <= p."lowStockAlert"
       ${filter}`,
    ...params
  );
  const total = Number(totalRow[0]?.count ?? 0);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};
var restockProduct = async (productId, actor, payload) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, sellerId: true, stock: true, status: true }
  });
  if (!product) throw new AppError_default(status45.NOT_FOUND, "Product not found");
  if (actor.role === Role.SELLER) {
    const seller2 = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true }
    });
    if (!seller2 || seller2.id !== product.sellerId) {
      throw new AppError_default(status45.FORBIDDEN, "Not your product");
    }
  }
  if (payload.variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: payload.variantId }
    });
    if (!variant || variant.productId !== productId) {
      throw new AppError_default(status45.NOT_FOUND, "Variant not found");
    }
    return prisma.productVariant.update({
      where: { id: payload.variantId },
      data: { stock: { increment: payload.stock } }
    });
  }
  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      stock: { increment: payload.stock },
      // Auto-flip ARCHIVED→ACTIVE? Only flip OUT_OF_STOCK→ACTIVE.
      status: product.status === ProductStatus.OUT_OF_STOCK ? ProductStatus.ACTIVE : product.status
    }
  });
  const seller = await prisma.seller.findFirst({
    where: { id: product.sellerId },
    select: { userId: true }
  });
  if (seller) {
    await notificationService.createNotification({
      userId: seller.userId,
      type: NotificationType.SYSTEM,
      title: "Stock updated",
      message: `${updated.name} stock is now ${updated.stock}.`,
      actionUrl: `/seller/products/${updated.id}`,
      metadata: { productId: updated.id, stock: updated.stock }
    }).catch(() => null);
  }
  return updated;
};
var summary4 = async (actor) => {
  const sellerId = await resolveSellerScope(actor);
  const where = { isDeleted: false, trackInventory: true };
  if (sellerId) where.sellerId = sellerId;
  const [totalProducts, allProducts] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: { stock: true, lowStockAlert: true, status: true }
    })
  ]);
  const lowStock2 = allProducts.filter((p) => p.stock <= p.lowStockAlert).length;
  const outOfStock = allProducts.filter((p) => p.stock === 0).length;
  const totalUnits = allProducts.reduce((s, p) => s + p.stock, 0);
  return { totalProducts, lowStock: lowStock2, outOfStock, totalUnits };
};
var inventoryService = {
  listLowStock,
  restockProduct,
  summary: summary4
};

// src/modules/inventory/inventory.controler.ts
var restockSchema = z19.object({
  stock: z19.number().int().positive(),
  variantId: z19.string().uuid().optional()
});
var lowStock = catchAsync(async (req, res) => {
  const result = await inventoryService.listLowStock(
    { userId: req.user.userId, role: req.user.role },
    req.query
  );
  sendResponse(res, {
    httpStatusCode: status46.OK,
    success: true,
    message: "Low-stock products fetched",
    data: result.data,
    meta: result.meta
  });
});
var restock = catchAsync(async (req, res) => {
  const result = await inventoryService.restockProduct(
    req.params.productId,
    { userId: req.user.userId, role: req.user.role },
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status46.OK,
    success: true,
    message: "Stock updated",
    data: result
  });
});
var summary5 = catchAsync(async (req, res) => {
  const result = await inventoryService.summary({
    userId: req.user.userId,
    role: req.user.role
  });
  sendResponse(res, {
    httpStatusCode: status46.OK,
    success: true,
    message: "Inventory summary",
    data: result
  });
});
var inventoryController = { lowStock, restock, summary: summary5 };

// src/modules/inventory/inventory.router.ts
var router23 = Router23();
router23.use(checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF));
router23.get("/low-stock", inventoryController.lowStock);
router23.get("/summary", inventoryController.summary);
router23.post(
  "/products/:productId/restock",
  validateRequest(restockSchema),
  inventoryController.restock
);
var inventoryRouter = router23;

// src/modules/shipping/shipping.router.ts
import { Router as Router24 } from "express";

// src/modules/shipping/shipping.controler.ts
import status47 from "http-status";
import { z as z20 } from "zod";

// src/modules/shipping/shipping.service.ts
var FREE_SHIPPING_THRESHOLD2 = 50;
var STANDARD_BASE = 5;
var EXPRESS_BASE = 15;
var PER_KG = 1.5;
var groupBySeller = (items) => {
  const map = /* @__PURE__ */ new Map();
  for (const it of items) {
    const arr = map.get(it.sellerId) ?? [];
    arr.push(it);
    map.set(it.sellerId, arr);
  }
  return map;
};
var defaultStrategy = {
  name: "flat-rate-v1",
  quote(req) {
    const currency = req.currency ?? "USD";
    const groups = groupBySeller(req.items);
    const isInternational = (req.destination.country ?? "US").toUpperCase() !== "US";
    const perSeller = [];
    for (const [sellerId, items] of groups) {
      const subtotal = round2(items.reduce((s, i) => s + i.lineSubtotal, 0));
      const weight = items.reduce(
        (s, i) => s + (i.weightGrams ?? 0) * i.quantity,
        0
      );
      const overweightKg = Math.max(0, (weight - 1e3) / 1e3);
      const weightSurcharge = round2(overweightKg * PER_KG);
      const intlMultiplier = isInternational ? 2 : 1;
      const standard = round2(
        subtotal >= FREE_SHIPPING_THRESHOLD2 && !isInternational ? 0 : (STANDARD_BASE + weightSurcharge) * intlMultiplier
      );
      const express = round2(
        (EXPRESS_BASE + weightSurcharge) * intlMultiplier
      );
      perSeller.push({
        sellerId,
        subtotal,
        weightGrams: weight,
        services: [
          {
            code: "STANDARD",
            label: "Standard shipping",
            cost: standard,
            currency,
            etaDays: isInternational ? { min: 7, max: 14 } : { min: 3, max: 5 }
          },
          {
            code: "EXPRESS",
            label: "Express shipping",
            cost: express,
            currency,
            etaDays: isInternational ? { min: 3, max: 6 } : { min: 1, max: 2 }
          }
        ]
      });
    }
    const cheapestTotal = round2(
      perSeller.reduce(
        (s, g) => s + Math.min(...g.services.map((svc) => svc.cost)),
        0
      )
    );
    return { perSeller, cheapestTotal, currency };
  }
};
var activeStrategy = defaultStrategy;
var setShippingStrategy = (s) => {
  activeStrategy = s;
};
var getShippingStrategy = () => activeStrategy;
var quoteShipping = async (req) => {
  return activeStrategy.quote(req);
};
var shippingService = {
  quoteShipping,
  getShippingStrategy,
  setShippingStrategy
};

// src/modules/shipping/shipping.controler.ts
var quoteShippingSchema = z20.object({
  destination: z20.object({
    country: z20.string().length(2),
    state: z20.string().max(120).optional(),
    city: z20.string().max(120).optional(),
    postalCode: z20.string().max(20).optional()
  }),
  items: z20.array(
    z20.object({
      productId: z20.string().uuid(),
      variantId: z20.string().uuid().optional(),
      quantity: z20.number().int().positive()
    })
  ).min(1).optional(),
  cartId: z20.string().uuid().optional()
});
var quote = catchAsync(async (req, res) => {
  const body = req.body;
  let resolved = [];
  if (body.items?.length) {
    const productIds = body.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isDeleted: false },
      select: {
        id: true,
        sellerId: true,
        price: true,
        weightGrams: true
      }
    });
    const variantIds = body.items.map((i) => i.variantId).filter((v) => !!v);
    const variants = variantIds.length ? await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, price: true, productId: true }
    }) : [];
    resolved = body.items.map((it) => {
      const p = products.find((p2) => p2.id === it.productId);
      if (!p) throw new AppError_default(status47.BAD_REQUEST, "Unknown product");
      const v = it.variantId ? variants.find((v2) => v2.id === it.variantId) : null;
      const unitPrice = toNumber(v?.price ?? p.price);
      return {
        productId: p.id,
        variantId: it.variantId ?? null,
        sellerId: p.sellerId,
        weightGrams: p.weightGrams,
        unitPrice,
        quantity: it.quantity,
        lineSubtotal: unitPrice * it.quantity
      };
    });
  } else if (body.cartId) {
    const cart = await prisma.cart.findUnique({
      where: { id: body.cartId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, sellerId: true, price: true, weightGrams: true }
            },
            variant: { select: { id: true, price: true } }
          }
        }
      }
    });
    if (!cart) throw new AppError_default(status47.NOT_FOUND, "Cart not found");
    resolved = cart.items.map((it) => {
      const unitPrice = toNumber(it.variant?.price ?? it.product.price);
      return {
        productId: it.productId,
        variantId: it.variantId ?? null,
        sellerId: it.product.sellerId,
        weightGrams: it.product.weightGrams,
        unitPrice,
        quantity: it.quantity,
        lineSubtotal: unitPrice * it.quantity
      };
    });
  } else {
    throw new AppError_default(
      status47.BAD_REQUEST,
      "Provide either `items` or `cartId`"
    );
  }
  const result = await shippingService.quoteShipping({
    items: resolved,
    destination: body.destination
  });
  sendResponse(res, {
    httpStatusCode: status47.OK,
    success: true,
    message: "Shipping quote",
    data: { ...result, strategy: shippingService.getShippingStrategy().name }
  });
});
var shippingController = { quote };

// src/modules/shipping/shipping.router.ts
var router24 = Router24();
router24.post("/quote", validateRequest(quoteShippingSchema), shippingController.quote);
var shippingRouter = router24;

// src/modules/search/search.router.ts
import { Router as Router25 } from "express";

// src/modules/search/search.controler.ts
import status48 from "http-status";
var search4 = catchAsync(async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  if (!q) {
    throw new AppError_default(status48.BAD_REQUEST, "Query `q` is required");
  }
  const rows = await prisma.$queryRawUnsafe(
    `SELECT p.id,
            ts_rank(
              to_tsvector('english', coalesce(p.name,'') || ' ' || coalesce(p."shortDesc",'') || ' ' || coalesce(p.description,'')),
              websearch_to_tsquery('english', $1)
            ) AS rank
     FROM products p
     WHERE p."isDeleted" = false
       AND p.status = 'ACTIVE'::"ProductStatus"
       AND (
         to_tsvector('english', coalesce(p.name,'') || ' ' || coalesce(p."shortDesc",'') || ' ' || coalesce(p.description,''))
           @@ websearch_to_tsquery('english', $1)
         OR p.name ILIKE '%' || $1 || '%'
         OR p.sku ILIKE '%' || $1 || '%'
       )
     ORDER BY rank DESC, p."soldCount" DESC, p."createdAt" DESC
     LIMIT ${limit} OFFSET ${offset}`,
    q
  );
  const ids = rows.map((r) => r.id);
  const products = ids.length ? await prisma.product.findMany({
    where: { id: { in: ids } },
    include: {
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      brand: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, slug: true } },
      seller: {
        select: {
          id: true,
          shopName: true,
          shopSlug: true,
          avgRating: true
        }
      }
    }
  }) : [];
  const orderMap = new Map(ids.map((id, idx) => [id, idx]));
  products.sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  );
  const totalRow = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::bigint AS count
     FROM products p
     WHERE p."isDeleted" = false
       AND p.status = 'ACTIVE'::"ProductStatus"
       AND (
         to_tsvector('english', coalesce(p.name,'') || ' ' || coalesce(p."shortDesc",'') || ' ' || coalesce(p.description,''))
           @@ websearch_to_tsquery('english', $1)
         OR p.name ILIKE '%' || $1 || '%'
         OR p.sku ILIKE '%' || $1 || '%'
       )`,
    q
  );
  const total = Number(totalRow[0]?.count ?? 0);
  sendResponse(res, {
    httpStatusCode: status48.OK,
    success: true,
    message: "Search results",
    data: products,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      query: q
    }
  });
});
var suggest = catchAsync(async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) {
    sendResponse(res, {
      httpStatusCode: status48.OK,
      success: true,
      message: "Suggestions",
      data: []
    });
    return;
  }
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
  const rows = await prisma.$queryRawUnsafe(
    `SELECT p.id, p.name, p.slug FROM products p
       WHERE p."isDeleted" = false AND p.status = 'ACTIVE'::"ProductStatus"
         AND p.name ILIKE '%' || $1 || '%'
       ORDER BY p."soldCount" DESC
       LIMIT ${limit}`,
    q
  );
  sendResponse(res, {
    httpStatusCode: status48.OK,
    success: true,
    message: "Suggestions",
    data: rows
  });
});
var searchController = { search: search4, suggest };

// src/modules/search/search.router.ts
var router25 = Router25();
router25.get("/", searchController.search);
router25.get("/suggest", searchController.suggest);
var searchRouter = router25;

// src/modules/productQa/productQa.router.ts
import { Router as Router26 } from "express";

// src/modules/productQa/productQa.controler.ts
import { z as z21 } from "zod";
import status50 from "http-status";

// src/modules/productQa/productQa.service.ts
import status49 from "http-status";
var listForProduct4 = async (productId, query2) => {
  const page = Math.max(1, Number(query2.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query2.limit) || 10));
  const where = { productId };
  if (query2.includeHidden !== "true") where.isHidden = false;
  const [data, total] = await Promise.all([
    prisma.productQuestion.findMany({
      where,
      orderBy: [{ isAnswered: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true } },
        answers: {
          where: query2.includeHidden === "true" ? {} : { isHidden: false },
          orderBy: [{ isOfficial: "desc" }, { createdAt: "asc" }],
          include: {
            user: { select: { id: true, name: true, role: true } }
          }
        }
      }
    }),
    prisma.productQuestion.count({ where })
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};
var askQuestion = async (userId, productId, question) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isDeleted: true }
  });
  if (!product || product.isDeleted) {
    throw new AppError_default(status49.NOT_FOUND, "Product not found");
  }
  return prisma.productQuestion.create({
    data: { productId, userId, question },
    include: { user: { select: { id: true, name: true } } }
  });
};
var answerQuestion = async (userId, role, questionId, answer2) => {
  const q = await prisma.productQuestion.findUnique({
    where: { id: questionId },
    include: { product: { select: { sellerId: true } } }
  });
  if (!q) throw new AppError_default(status49.NOT_FOUND, "Question not found");
  if (q.isHidden) {
    throw new AppError_default(status49.BAD_REQUEST, "Cannot answer a hidden question");
  }
  let isOfficial = role === Role.ADMIN || role === Role.STAFF;
  if (!isOfficial && role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (seller && seller.id === q.product.sellerId) {
      isOfficial = true;
    }
  }
  const created = await prisma.$transaction(async (tx) => {
    const ans = await tx.productAnswer.create({
      data: { questionId, userId, answer: answer2, isOfficial },
      include: { user: { select: { id: true, name: true, role: true } } }
    });
    await tx.productQuestion.update({
      where: { id: questionId },
      data: { isAnswered: true }
    });
    return ans;
  });
  return created;
};
var setQuestionHidden = async (questionId, hide, actor) => {
  const q = await prisma.productQuestion.findUnique({
    where: { id: questionId },
    include: { product: { select: { sellerId: true } } }
  });
  if (!q) throw new AppError_default(status49.NOT_FOUND, "Question not found");
  if (actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true }
    });
    if (!seller || seller.id !== q.product.sellerId) {
      throw new AppError_default(status49.FORBIDDEN, "Not your product");
    }
  }
  return prisma.productQuestion.update({
    where: { id: questionId },
    data: { isHidden: hide }
  });
};
var setAnswerHidden = async (answerId, hide, actor) => {
  const a = await prisma.productAnswer.findUnique({
    where: { id: answerId },
    include: {
      question: { include: { product: { select: { sellerId: true } } } }
    }
  });
  if (!a) throw new AppError_default(status49.NOT_FOUND, "Answer not found");
  if (actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true }
    });
    if (!seller || seller.id !== a.question.product.sellerId) {
      throw new AppError_default(status49.FORBIDDEN, "Not your product");
    }
  } else if (actor.role === Role.CUSTOMER) {
    if (a.userId !== actor.userId) {
      throw new AppError_default(status49.FORBIDDEN, "Not your answer");
    }
  }
  return prisma.productAnswer.update({
    where: { id: answerId },
    data: { isHidden: hide }
  });
};
var productQaService = {
  listForProduct: listForProduct4,
  askQuestion,
  answerQuestion,
  setQuestionHidden,
  setAnswerHidden
};

// src/modules/productQa/productQa.controler.ts
var askQuestionSchema = z21.object({
  question: z21.string().min(5).max(2e3)
});
var answerQuestionSchema = z21.object({
  answer: z21.string().min(2).max(4e3)
});
var list8 = catchAsync(async (req, res) => {
  const result = await productQaService.listForProduct(
    req.params.productId,
    req.query
  );
  sendResponse(res, {
    httpStatusCode: status50.OK,
    success: true,
    message: "Questions fetched",
    data: result.data,
    meta: result.meta
  });
});
var ask = catchAsync(async (req, res) => {
  const result = await productQaService.askQuestion(
    req.user.userId,
    req.params.productId,
    req.body.question
  );
  sendResponse(res, {
    httpStatusCode: status50.CREATED,
    success: true,
    message: "Question posted",
    data: result
  });
});
var answer = catchAsync(async (req, res) => {
  const result = await productQaService.answerQuestion(
    req.user.userId,
    req.user.role,
    req.params.questionId,
    req.body.answer
  );
  sendResponse(res, {
    httpStatusCode: status50.CREATED,
    success: true,
    message: "Answer posted",
    data: result
  });
});
var hideQuestion = catchAsync(async (req, res) => {
  const result = await productQaService.setQuestionHidden(
    req.params.questionId,
    true,
    { userId: req.user.userId, role: req.user.role }
  );
  sendResponse(res, {
    httpStatusCode: status50.OK,
    success: true,
    message: "Question hidden",
    data: result
  });
});
var unhideQuestion = catchAsync(async (req, res) => {
  const result = await productQaService.setQuestionHidden(
    req.params.questionId,
    false,
    { userId: req.user.userId, role: req.user.role }
  );
  sendResponse(res, {
    httpStatusCode: status50.OK,
    success: true,
    message: "Question restored",
    data: result
  });
});
var hideAnswer = catchAsync(async (req, res) => {
  const result = await productQaService.setAnswerHidden(
    req.params.answerId,
    true,
    { userId: req.user.userId, role: req.user.role }
  );
  sendResponse(res, {
    httpStatusCode: status50.OK,
    success: true,
    message: "Answer hidden",
    data: result
  });
});
var productQaController = {
  list: list8,
  ask,
  answer,
  hideQuestion,
  unhideQuestion,
  hideAnswer
};

// src/modules/productQa/productQa.router.ts
var router26 = Router26();
router26.get("/products/:productId/questions", productQaController.list);
router26.post(
  "/products/:productId/questions",
  checkAuth(Role.CUSTOMER, Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(askQuestionSchema),
  productQaController.ask
);
router26.post(
  "/questions/:questionId/answers",
  checkAuth(Role.CUSTOMER, Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(answerQuestionSchema),
  productQaController.answer
);
router26.patch(
  "/questions/:questionId/hide",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  productQaController.hideQuestion
);
router26.patch(
  "/questions/:questionId/unhide",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  productQaController.unhideQuestion
);
router26.patch(
  "/answers/:answerId/hide",
  checkAuth(Role.CUSTOMER, Role.SELLER, Role.ADMIN, Role.STAFF),
  productQaController.hideAnswer
);
var productQaRouter = router26;

// src/modules/recommendation/recommendation.router.ts
import { Router as Router27 } from "express";

// src/modules/recommendation/recommendation.controler.ts
import status51 from "http-status";
var productInclude = {
  images: { take: 1, orderBy: { sortOrder: "asc" } },
  seller: { select: { id: true, shopName: true, shopSlug: true } }
};
var fbt = catchAsync(async (req, res) => {
  const productId = req.params.productId;
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 6));
  const rows = await prisma.$queryRawUnsafe(
    `SELECT other."productId" AS product_id,
              COUNT(*)::bigint AS cooccurrence
       FROM order_items oi
       JOIN order_items other
         ON oi."orderId" = other."orderId"
        AND oi."productId" <> other."productId"
       WHERE oi."productId" = $1::uuid
       GROUP BY other."productId"
       ORDER BY cooccurrence DESC
       LIMIT ${limit}`,
    productId
  );
  const ids = rows.map((r) => r.product_id);
  const products = ids.length ? await prisma.product.findMany({
    where: { id: { in: ids }, isDeleted: false, status: "ACTIVE" },
    include: productInclude
  }) : [];
  if (products.length < limit) {
    const seed = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true }
    });
    if (seed) {
      const fillIds = products.map((p) => p.id);
      const extra = await prisma.product.findMany({
        where: {
          id: { notIn: [productId, ...fillIds] },
          categoryId: seed.categoryId,
          isDeleted: false,
          status: "ACTIVE"
        },
        orderBy: [{ soldCount: "desc" }, { createdAt: "desc" }],
        take: limit - products.length,
        include: productInclude
      });
      products.push(...extra);
    }
  }
  const orderMap = new Map(ids.map((id, idx) => [id, idx]));
  products.sort((a, b) => {
    const ai = orderMap.get(a.id) ?? 999;
    const bi = orderMap.get(b.id) ?? 999;
    return ai - bi;
  });
  sendResponse(res, {
    httpStatusCode: status51.OK,
    success: true,
    message: "Frequently bought together",
    data: products,
    meta: {
      seedProductId: productId,
      fromCoOccurrence: ids.length,
      total: products.length
    }
  });
});
var alsoViewed = catchAsync(async (req, res) => {
  const productId = req.params.productId;
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 6));
  const seed = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true }
  });
  if (!seed) {
    sendResponse(res, {
      httpStatusCode: status51.OK,
      success: true,
      message: "Customers also viewed",
      data: []
    });
    return;
  }
  const data = await prisma.product.findMany({
    where: {
      id: { not: productId },
      categoryId: seed.categoryId,
      isDeleted: false,
      status: "ACTIVE"
    },
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: productInclude
  });
  sendResponse(res, {
    httpStatusCode: status51.OK,
    success: true,
    message: "Customers also viewed",
    data
  });
});
var forYou = catchAsync(async (req, res) => {
  const limit = Math.min(40, Math.max(1, Number(req.query.limit) || 12));
  const userId = req.user?.userId;
  let categoryIds = [];
  if (userId) {
    const recent = await prisma.orderItem.findMany({
      where: { order: { userId } },
      select: { product: { select: { categoryId: true } } },
      take: 50,
      orderBy: { createdAt: "desc" }
    });
    categoryIds = Array.from(
      new Set(recent.map((r) => r.product.categoryId))
    );
  }
  const data = await prisma.product.findMany({
    where: {
      isDeleted: false,
      status: "ACTIVE",
      ...categoryIds.length ? { categoryId: { in: categoryIds } } : {}
    },
    orderBy: [
      { soldCount: "desc" },
      { avgRating: "desc" },
      { viewCount: "desc" }
    ],
    take: limit,
    include: productInclude
  });
  sendResponse(res, {
    httpStatusCode: status51.OK,
    success: true,
    message: "For you",
    data,
    meta: { personalized: categoryIds.length > 0, categoryCount: categoryIds.length }
  });
});
var recommendationController = { fbt, alsoViewed, forYou };

// src/modules/recommendation/recommendation.router.ts
var router27 = Router27();
router27.get(
  "/products/:productId/frequently-bought-together",
  recommendationController.fbt
);
router27.get("/products/:productId/also-viewed", recommendationController.alsoViewed);
router27.get("/for-you", optionalAuth, recommendationController.forYou);
var recommendationRouter = router27;

// src/index.ts
var router28 = Router28();
router28.use("/auth", authRoutes);
router28.use("/users", userRouter);
router28.use("/admin", adminRouter);
router28.use("/categories", categoryRouter);
router28.use("/brands", brandRouter);
router28.use("/products", productRouter);
router28.use("/search", searchRouter);
router28.use("/sellers", sellerRouter);
router28.use("/cart", cartRouter);
router28.use("/orders", orderRouter);
router28.use("/seller-orders", sellerOrderRouter);
router28.use("/payouts", payoutRouter);
router28.use("/addresses", addressRouter);
router28.use("/reviews", reviewRouter);
router28.use("/wishlist", wishlistRouter);
router28.use("/coupons", couponRouter);
router28.use("/refunds", refundRouter);
router28.use("/inventory", inventoryRouter);
router28.use("/shipping", shippingRouter);
router28.use("/", productQaRouter);
router28.use("/recommendations", recommendationRouter);
router28.use("/", stripeConnectRouter);
router28.use("/payments", PaymentRoutes);
router28.use("/notifications", notificationRouter);
router28.use("/ai", aiRoutes);
router28.use("/stats", StatsRoutes);
var indexRoutes = router28;

export {
  auth,
  DEMO_ACCOUNTS,
  seedAdmin,
  seedDemoAccounts,
  apiLimiter,
  authRoutes,
  PaymentController,
  indexRoutes
};
