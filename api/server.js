import {
  DEMO_ACCOUNTS,
  PaymentController,
  apiLimiter,
  auth,
  authRoutes,
  indexRoutes,
  seedAdmin,
  seedDemoAccounts
} from "./chunk-SFSO5VFS.js";
import {
  AddressType,
  AppError_default,
  CartStatus,
  CouponDiscountType,
  FulfillmentStatus,
  KycStatus,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  PayoutMethod,
  PayoutStatus,
  ProductCondition,
  ProductStatus,
  RefundReason,
  RefundStatus,
  ReviewStatus,
  Role,
  SellerOrderStatus,
  SellerStatus,
  UserStatus,
  connectPrismaWithRetry,
  envVars,
  prisma,
  prismaNamespace_exports,
  round2,
  slugify,
  toNumber
} from "./chunk-EM24WAHR.js";

// src/app.ts
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { toNodeHandler } from "better-auth/node";

// src/middleware/globalErrorHandler.ts
import status3 from "http-status";
import z from "zod";

// src/errorHelpers/handlePrismaError.ts
import status from "http-status";
var getStatusCodeFromPrismaError = (errorCode) => {
  if (errorCode === "P2002") {
    return status.CONFLICT;
  }
  if (["P2025", "P2001", "P2015", "P2018"].includes(errorCode)) {
    return status.NOT_FOUND;
  }
  if (["P1000", "P6002"].includes(errorCode)) {
    return status.UNAUTHORIZED;
  }
  if (["P1010", "P6010"].includes(errorCode)) {
    return status.FORBIDDEN;
  }
  if (errorCode === "P6003") {
    return status.PAYMENT_REQUIRED;
  }
  if (["P1008", "P2004", "P6004"].includes(errorCode)) {
    return status.GATEWAY_TIMEOUT;
  }
  if (errorCode === "P5011") {
    return status.TOO_MANY_REQUESTS;
  }
  if (errorCode === "P6009") {
    return 413;
  }
  if (errorCode.startsWith("P1") || ["P2024", "P2037", "P6008"].includes(errorCode)) {
    return status.SERVICE_UNAVAILABLE;
  }
  if (errorCode.startsWith("P2")) {
    return status.BAD_REQUEST;
  }
  if (errorCode.startsWith("P3") || errorCode.startsWith("P4")) {
    return status.INTERNAL_SERVER_ERROR;
  }
  return status.INTERNAL_SERVER_ERROR;
};
var formatErrorMeta = (meta) => {
  if (!meta) return "";
  const parts = [];
  if (meta.target) {
    parts.push(`Field(s): ${String(meta.target)}`);
  }
  if (meta.field_name) {
    parts.push(`Field: ${String(meta.field_name)}`);
  }
  if (meta.column_name) {
    parts.push(`Column: ${String(meta.column_name)}`);
  }
  if (meta.table) {
    parts.push(`Table: ${String(meta.table)}`);
  }
  if (meta.model_name) {
    parts.push(`Model: ${String(meta.model_name)}`);
  }
  if (meta.relation_name) {
    parts.push(`Relation: ${String(meta.relation_name)}`);
  }
  if (meta.constraint) {
    parts.push(`Constraint: ${String(meta.constraint)}`);
  }
  if (meta.database_error) {
    parts.push(`Database Error: ${String(meta.database_error)}`);
  }
  return parts.length > 0 ? parts.join(" |") : "";
};
var handlePrismaClientKnownRequestError = (error) => {
  const statusCode = getStatusCodeFromPrismaError(error.code);
  const metaInfo = formatErrorMeta(error.meta);
  let cleanMessage = error.message;
  cleanMessage = cleanMessage.replace(/Invalid `.*?` invocation:?\s*/i, "");
  const lines = cleanMessage.split("\n").filter((line) => line.trim());
  const mainMessage = lines[0] || "An error occurred with the database operation.";
  const errorSources = [
    {
      path: error.code,
      message: metaInfo ? `${mainMessage} | ${metaInfo}` : mainMessage
    }
  ];
  if (error.meta?.cause) {
    errorSources.push({
      path: "cause",
      message: String(error.meta.cause)
    });
  }
  return {
    success: false,
    statusCode,
    message: `Prisma Client Known Request Error: ${mainMessage}`,
    errorSources
  };
};
var handlePrismaClientUnknownError = (error) => {
  let cleanMessage = error.message;
  cleanMessage = cleanMessage.replace(/Invalid `.*?` invocation:?\s*/i, "");
  const lines = cleanMessage.split("\n").filter((line) => line.trim());
  const mainMessage = lines[0] || "An unknown error occurred with the database operation.";
  const errorSources = [
    {
      path: "Unknown Prisma Error",
      message: mainMessage
    }
  ];
  return {
    success: false,
    statusCode: status.INTERNAL_SERVER_ERROR,
    message: `Prisma Client Unknown Request Error: ${mainMessage}`,
    errorSources
  };
};
var handlePrismaClientValidationError = (error) => {
  let cleanMessage = error.message;
  cleanMessage = cleanMessage.replace(/Invalid `.*?` invocation:?\s*/i, "");
  const lines = cleanMessage.split("\n").filter((line) => line.trim());
  const errorSources = [];
  const fieldMatch = cleanMessage.match(/Argument `(\w+)`/i);
  const fieldName = fieldMatch ? fieldMatch[1] : "Unknown Field";
  const mainMessage = lines.find(
    (line) => !line.includes("Argument") && !line.includes("\u2192") && line.length > 10
  ) || lines[0] || "Invalid query parameters provided to the database operation.";
  errorSources.push({
    path: fieldName,
    message: mainMessage
  });
  return {
    success: false,
    statusCode: status.BAD_REQUEST,
    message: `Prisma Client Validation Error: ${mainMessage}`,
    errorSources
  };
};
var handlerPrismaClientInitializationError = (error) => {
  const statusCode = error.errorCode ? getStatusCodeFromPrismaError(error.errorCode) : status.SERVICE_UNAVAILABLE;
  const cleanMessage = error.message;
  cleanMessage.replace(/Invalid `.*?` invocation:?\s*/i, "");
  const lines = cleanMessage.split("\n").filter((line) => line.trim());
  const mainMessage = lines[0] || "An error occurred while initializing the Prisma Client.";
  const errorSources = [
    {
      path: error.errorCode || "Initialization Error",
      message: mainMessage
    }
  ];
  return {
    success: false,
    statusCode,
    message: `Prisma Client Initialization Error: ${mainMessage}`,
    errorSources
  };
};
var handlerPrismaClientRustPanicError = () => {
  const errorSources = [{
    path: "Rust Engine Crashed",
    message: "The database engine encountered a fatal error and crashed. This is usually due to an internal bug in the Prisma engine or an unexpected edge case in the database operation. Please check the Prisma logs for more details and consider reporting this issue to the Prisma team if it persists."
  }];
  return {
    success: false,
    statusCode: status.INTERNAL_SERVER_ERROR,
    message: "Prisma Client Rust Panic Error: The database engine crashed due to a fatal error.",
    errorSources
  };
};

// src/errorHelpers/handleZodError.ts
import status2 from "http-status";
var handleZodError = (err) => {
  const statusCode = status2.BAD_REQUEST;
  const message = "Zod Validation error";
  const errorSource = [];
  err.issues.forEach((issue) => {
    errorSource.push({
      path: issue.path.join(".") || "unknown",
      message: issue.message
    });
  });
  return {
    success: false,
    message,
    errorSources: errorSource,
    statusCode
  };
};

// src/middleware/globalErrorHandler.ts
var isBetterAuthHandledError = (err) => {
  if (!err || typeof err !== "object") {
    return false;
  }
  const candidate = err;
  return typeof candidate.statusCode === "number" || typeof candidate.status === "string" || typeof candidate.body?.message === "string";
};
var globalErrorHandler = async (err, req, res, next) => {
  if (envVars.NODE_ENV === "development") {
    if (err instanceof AppError_default && err.statusCode < 500) {
      console.warn(`[Handled AppError ${err.statusCode}] ${req.method} ${req.originalUrl} -> ${err.message}`);
    } else if (isBetterAuthHandledError(err) && ((err.statusCode ?? 500) < 500 || err.status === "UNAUTHORIZED" || err.status === "BAD_REQUEST" || err.status === "FORBIDDEN")) {
      console.warn(`[Handled Auth Error ${err.statusCode ?? err.status ?? 400}] ${req.method} ${req.originalUrl} -> ${err.body?.message ?? err.message ?? "Authentication error"}`);
    } else {
      console.error("Error from Global Error Handler", err);
    }
  }
  let errorSources = [];
  let statusCode = status3.INTERNAL_SERVER_ERROR;
  let message = "Internal Server Error";
  let stack = void 0;
  if (err instanceof prismaNamespace_exports.PrismaClientKnownRequestError) {
    const simplifiedError = handlePrismaClientKnownRequestError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof prismaNamespace_exports.PrismaClientUnknownRequestError) {
    const simplifiedError = handlePrismaClientUnknownError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof prismaNamespace_exports.PrismaClientValidationError) {
    const simplifiedError = handlePrismaClientValidationError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof prismaNamespace_exports.PrismaClientRustPanicError) {
    const simplifiedError = handlerPrismaClientRustPanicError();
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof prismaNamespace_exports.PrismaClientInitializationError) {
    const simplifiedError = handlerPrismaClientInitializationError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof z.ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof AppError_default) {
    statusCode = err.statusCode;
    message = err.message;
    stack = err.stack;
    errorSources = [
      {
        path: "",
        message: err.message
      }
    ];
  } else if (isBetterAuthHandledError(err)) {
    statusCode = typeof err.statusCode === "number" ? err.statusCode : err.status === "UNAUTHORIZED" ? status3.UNAUTHORIZED : err.status === "FORBIDDEN" ? status3.FORBIDDEN : err.status === "BAD_REQUEST" ? status3.BAD_REQUEST : status3.INTERNAL_SERVER_ERROR;
    message = err.body?.message || err.message || message;
    stack = err instanceof Error ? err.stack : void 0;
    errorSources = [
      {
        path: "",
        message
      }
    ];
  } else if (err instanceof Error) {
    statusCode = status3.INTERNAL_SERVER_ERROR;
    message = err.message;
    stack = err.stack;
    errorSources = [
      {
        path: "",
        message: err.message
      }
    ];
  }
  const errorResponse = {
    success: false,
    message,
    errorSources,
    error: envVars.NODE_ENV === "development" ? err : void 0,
    stack: envVars.NODE_ENV === "development" ? stack : void 0
  };
  res.status(statusCode).json(errorResponse);
};

// src/middleware/notFound.ts
import status4 from "http-status";
var notFound = (req, res) => {
  res.status(status4.NOT_FOUND).json({
    success: false,
    message: `Route ${req.originalUrl} Not Found `
  });
};

// src/app.ts
var app = express();
app.set("trust proxy", 1);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/demo", express.static(path.join(process.cwd(), "public")));
app.post(
  "/api/v1/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.handleStripeWebhookEvent
);
app.use(
  cors({
    origin: [envVars.FRONTEND_URL, envVars.BETTER_AUTH_URL],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", toNodeHandler(auth));
app.get("/", (req, res) => {
  res.send("Nexora Backend Running Successfully!");
});
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
app.use("/auth", authRoutes);
app.use("/api/v1", apiLimiter, indexRoutes);
app.use(globalErrorHandler);
app.use(notFound);
var app_default = app;

// src/server.ts
import { createServer } from "http";

// src/utilis/demoData.ts
var pad = (n, len = 6) => String(n).padStart(len, "0");
var ensureBetterAuthUser = async (params) => {
  const existing = await prisma.user.findUnique({
    where: { email: params.email }
  });
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
var upsertCategory = async (name, parentSlug) => {
  const slug = slugify(name);
  const parent = parentSlug ? await prisma.category.findUnique({ where: { slug: parentSlug } }) : null;
  return prisma.category.upsert({
    where: { slug },
    update: {},
    create: {
      name,
      slug,
      parentId: parent?.id ?? null,
      isActive: true,
      isFeatured: !parent
    }
  });
};
var upsertBrand = async (name) => {
  const slug = slugify(name);
  return prisma.brand.upsert({
    where: { slug },
    update: {},
    create: { name, slug, isActive: true, isFeatured: true }
  });
};
var upsertSeller = async (params) => {
  const user = await ensureBetterAuthUser(params);
  if (!user) return null;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      role: Role.SELLER,
      status: UserStatus.ACTIVE,
      isDeleted: false
    }
  });
  const seller = await prisma.seller.upsert({
    where: { userId: user.id },
    update: {
      status: SellerStatus.APPROVED,
      kycStatus: KycStatus.APPROVED,
      isDeleted: false,
      shopName: params.shopName,
      shopSlug: params.shopSlug,
      tagline: params.tagline,
      stripeOnboardingDone: params.stripeOnboardingDone ?? false
    },
    create: {
      userId: user.id,
      shopName: params.shopName,
      shopSlug: params.shopSlug,
      tagline: params.tagline,
      description: `${params.shopName} \u2014 curated electronics and accessories on Nexora.`,
      contactEmail: params.email,
      country: params.country ?? "US",
      legalName: params.shopName,
      status: SellerStatus.APPROVED,
      kycStatus: KycStatus.APPROVED,
      payoutMethod: params.stripeOnboardingDone ? PayoutMethod.STRIPE_CONNECT : PayoutMethod.MANUAL_BANK,
      stripeOnboardingDone: params.stripeOnboardingDone ?? false,
      approvedAt: /* @__PURE__ */ new Date(),
      commissionRate: params.commissionRate ?? 10
    }
  });
  return { user, seller };
};
var upsertCustomer = async (params) => {
  const user = await ensureBetterAuthUser(params);
  if (!user) return null;
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
    update: { fullName: params.name, email: params.email },
    create: { userId: user.id, fullName: params.name, email: params.email }
  });
  await prisma.wishlist.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id }
  }).catch(() => null);
  return user;
};
var PRODUCT_PALETTE = [
  // [name, brand, category, basePrice, weight, lowStock, stock, isOnSale]
  ["Aurora 14 Pro Laptop", "Nexora Tech", "Laptops", 1499, 1700, 3, 18, false],
  ["Stellar 16 Studio Laptop", "Nexora Tech", "Laptops", 2199, 2100, 2, 9, true],
  ["Quantum X Mini PC", "Nexora Tech", "Computers", 899, 800, 4, 25, false],
  ["Halo Wireless Earbuds", "Halo Audio", "Audio", 149, 60, 10, 84, true],
  ["Halo Studio Headphones", "Halo Audio", "Audio", 299, 320, 5, 42, false],
  ["Pulse Smart Speaker", "Halo Audio", "Audio", 119, 950, 4, 31, false],
  ["Orbit Smartwatch S2", "Orbit Wear", "Wearables", 249, 55, 6, 7, true],
  // low stock
  ["Orbit Fitness Band", "Orbit Wear", "Wearables", 79, 30, 8, 4, true],
  // low stock
  ["Lumen 4K Action Cam", "Lumen Imaging", "Cameras", 369, 220, 4, 22, false],
  ["Lumen Mirrorless Camera", "Lumen Imaging", "Cameras", 1299, 600, 2, 11, true],
  ["Voltix Power Bank 30k", "Voltix", "Accessories", 79, 540, 6, 60, false],
  ["Voltix USB-C Hub 8-in-1", "Voltix", "Accessories", 59, 120, 8, 0, false],
  // out of stock
  ["NexoSmart Doorbell Cam", "Nexora Home", "Smart Home", 199, 380, 5, 14, true],
  ["NexoSmart Hub Mini", "Nexora Home", "Smart Home", 89, 210, 4, 38, false],
  ["EcoCharge Solar Pad 20W", "Voltix", "Accessories", 109, 700, 4, 29, false],
  ["Aero Mechanical Keyboard", "Aero Peripherals", "Peripherals", 159, 980, 4, 17, false],
  ["Aero Pro Gaming Mouse", "Aero Peripherals", "Peripherals", 89, 110, 6, 33, true],
  ["NexoLens AR Glasses", "Nexora Tech", "Wearables", 599, 90, 2, 6, false],
  // low stock
  ["Halo Noise-Cancel Mini", "Halo Audio", "Audio", 199, 200, 6, 50, false],
  ["Quantum Dock Pro", "Nexora Tech", "Accessories", 229, 480, 4, 21, false],
  ["Pulse Soundbar 2.1", "Halo Audio", "Audio", 349, 3400, 3, 12, true],
  ["Orbit Active GPS Watch", "Orbit Wear", "Wearables", 329, 70, 4, 18, false],
  ["Lumen Drone Air 2", "Lumen Imaging", "Cameras", 899, 600, 3, 8, false],
  // low stock
  ["Voltix Cable Pack 6-pc", "Voltix", "Accessories", 29, 250, 12, 200, false],
  ["NexoSmart Smart Plug 4-pk", "Nexora Home", "Smart Home", 39, 160, 10, 90, false],
  ['Aero Curve Monitor 34"', "Aero Peripherals", "Peripherals", 549, 7800, 2, 9, true],
  ["NexoSecure Smart Lock", "Nexora Home", "Smart Home", 269, 800, 3, 15, false],
  ["Halo Microphone Pro", "Halo Audio", "Audio", 169, 360, 5, 25, false],
  ["Voltix Wireless Charger 3-in-1", "Voltix", "Accessories", 69, 290, 8, 56, true],
  ["Lumen Webcam 4K", "Lumen Imaging", "Cameras", 149, 130, 6, 31, false]
];
var seedComprehensiveDemoData = async () => {
  const existingProducts = await prisma.product.count();
  if (existingProducts > 20) {
    console.log(
      `[demo] catalog already has ${existingProducts} products \u2014 skipping big seed`
    );
    return;
  }
  console.log("[demo] seeding comprehensive marketplace data\u2026");
  const cats = await Promise.all([
    upsertCategory("Electronics"),
    upsertCategory("Smart Home")
  ]);
  const electronics = cats[0];
  const smartHome = cats[1];
  const Laptops = await upsertCategory("Laptops", electronics.slug);
  const Computers = await upsertCategory("Computers", electronics.slug);
  const Audio = await upsertCategory("Audio", electronics.slug);
  const Wearables = await upsertCategory("Wearables", electronics.slug);
  const Cameras = await upsertCategory("Cameras", electronics.slug);
  const Peripherals = await upsertCategory("Peripherals", electronics.slug);
  const Accessories = await upsertCategory("Accessories", electronics.slug);
  const SmartHomeChild = await upsertCategory("Smart Home Devices", smartHome.slug);
  const categoryByLabel = {
    Laptops,
    Computers,
    Audio,
    Wearables,
    Cameras,
    Peripherals,
    Accessories,
    "Smart Home": SmartHomeChild
  };
  const brandLabels = [
    "Nexora Tech",
    "Halo Audio",
    "Orbit Wear",
    "Lumen Imaging",
    "Voltix",
    "Nexora Home",
    "Aero Peripherals"
  ];
  const brandMap = {};
  for (const b of brandLabels) {
    brandMap[b] = await upsertBrand(b);
  }
  const demoSellerEntry = await prisma.seller.findUnique({
    where: { userId: void 0 }
    // placeholder, we look up via shopSlug
  }).catch(() => null);
  const demoShopSeller = await prisma.seller.findUnique({
    where: { shopSlug: DEMO_ACCOUNTS.seller.shopSlug }
  });
  if (!demoShopSeller) {
    console.warn("[demo] demo seller missing \u2014 was seedDemoAccounts run first?");
    return;
  }
  const extraSellers = await Promise.all([
    upsertSeller({
      email: "halo.audio@nexora.dev",
      password: "Demo@1234",
      name: "Halo Audio Co.",
      shopName: "Halo Audio Store",
      shopSlug: "halo-audio",
      tagline: "Studio-grade headphones, IEMs and home sound",
      stripeOnboardingDone: true
    }),
    upsertSeller({
      email: "voltix@nexora.dev",
      password: "Demo@1234",
      name: "Voltix Power",
      shopName: "Voltix Power",
      shopSlug: "voltix-power",
      tagline: "Charge anything, anywhere",
      stripeOnboardingDone: false
    }),
    upsertSeller({
      email: "lumen.imaging@nexora.dev",
      password: "Demo@1234",
      name: "Lumen Imaging",
      shopName: "Lumen Imaging",
      shopSlug: "lumen-imaging",
      tagline: "Cameras, drones and creator gear",
      stripeOnboardingDone: true,
      country: "GB"
    }),
    upsertSeller({
      email: "aero.peripherals@nexora.dev",
      password: "Demo@1234",
      name: "Aero Peripherals",
      shopName: "Aero Peripherals",
      shopSlug: "aero-peripherals",
      tagline: "Mechanical keyboards, mice and monitors",
      commissionRate: 12,
      stripeOnboardingDone: false
    }),
    upsertSeller({
      email: "nexora.home@nexora.dev",
      password: "Demo@1234",
      name: "Nexora Home",
      shopName: "Nexora Home",
      shopSlug: "nexora-home",
      tagline: "Connected home, made calm",
      stripeOnboardingDone: true
    })
  ]);
  const allSellers = [
    {
      sellerId: demoShopSeller.id,
      userId: demoShopSeller.userId,
      shopName: demoShopSeller.shopName
    },
    ...extraSellers.filter((s) => s !== null).map((s) => ({
      sellerId: s.seller.id,
      userId: s.seller.userId,
      shopName: s.seller.shopName
    }))
  ];
  const sellerByShop = {};
  for (const s of allSellers) sellerByShop[s.shopName] = s;
  const brandToShop = {
    "Nexora Tech": "Demo Shop",
    "Halo Audio": "Halo Audio Store",
    "Voltix": "Voltix Power",
    "Lumen Imaging": "Lumen Imaging",
    "Aero Peripherals": "Aero Peripherals",
    "Nexora Home": "Nexora Home",
    "Orbit Wear": "Halo Audio Store"
    // give Halo a 2nd brand for variety
  };
  const createdProducts = [];
  for (let i = 0; i < PRODUCT_PALETTE.length; i++) {
    const [name, brand, catLabel, price, weight, lowStock, stock, isOnSale] = PRODUCT_PALETTE[i];
    const slug = slugify(name);
    const sku = `NX-${pad(i + 1, 4)}-${brand.toUpperCase().slice(0, 3)}`;
    const sellerKey = brandToShop[brand] ?? "Demo Shop";
    const seller = sellerByShop[sellerKey] ?? sellerByShop["Demo Shop"];
    const cat = categoryByLabel[catLabel] ?? Accessories;
    const br = brandMap[brand];
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      createdProducts.push({
        id: existing.id,
        name: existing.name,
        sku: existing.sku,
        sellerId: existing.sellerId,
        price: toNumber(existing.price),
        currency: existing.currency
      });
      continue;
    }
    const created = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        shortDesc: `${name} \u2014 premium ${catLabel.toLowerCase()} from ${brand}.`,
        description: `## ${name}

Flagship ${catLabel.toLowerCase()} from ${brand}. Designed for the Nexora marketplace demo. Includes a 1-year warranty and 30-day return window.`,
        price,
        compareAtPrice: isOnSale ? round2(price * 1.25) : void 0,
        currency: "USD",
        stock,
        lowStockAlert: lowStock,
        trackInventory: true,
        weightGrams: weight,
        status: stock === 0 ? ProductStatus.OUT_OF_STOCK : ProductStatus.ACTIVE,
        condition: ProductCondition.NEW,
        isFeatured: i % 5 === 0,
        isBestseller: i % 4 === 0,
        isNewArrival: i % 6 === 0,
        isOnSale: !!isOnSale,
        sellerId: seller.sellerId,
        brandId: br.id,
        categoryId: cat.id,
        publishedAt: /* @__PURE__ */ new Date(),
        images: {
          create: [
            {
              url: `https://picsum.photos/seed/${encodeURIComponent(slug)}/640/640`,
              alt: name,
              isPrimary: true,
              sortOrder: 0
            },
            {
              url: `https://picsum.photos/seed/${encodeURIComponent(slug)}-2/640/640`,
              alt: `${name} alt`,
              sortOrder: 1
            }
          ]
        },
        specifications: {
          create: [
            {
              group: "General",
              label: "Brand",
              value: brand,
              sortOrder: 0
            },
            {
              group: "General",
              label: "Warranty",
              value: "12 months",
              sortOrder: 1
            },
            {
              group: "Physical",
              label: "Weight",
              value: `${weight} g`,
              sortOrder: 2
            }
          ]
        }
      }
    });
    await prisma.seller.update({
      where: { id: seller.sellerId },
      data: { productCount: { increment: 1 } }
    });
    createdProducts.push({
      id: created.id,
      name: created.name,
      sku: created.sku,
      sellerId: created.sellerId,
      price: toNumber(created.price),
      currency: created.currency
    });
  }
  await prisma.coupon.upsert({
    where: { code: "NEXORA10" },
    update: {},
    create: {
      code: "NEXORA10",
      description: "10% off site-wide",
      discountType: CouponDiscountType.PERCENT,
      discountValue: 10,
      minOrderAmount: 50,
      maxDiscount: 100,
      usageLimit: 1e3,
      usedCount: 0,
      isActive: true,
      startsAt: /* @__PURE__ */ new Date(),
      endsAt: new Date(Date.now() + 90 * 864e5)
    }
  }).catch(() => null);
  const customerEmails = [
    ["alice.morgan@example.com", "Alice Morgan"],
    ["ben.taylor@example.com", "Ben Taylor"],
    ["chen.li@example.com", "Chen Li"],
    ["diego.santos@example.com", "Diego Santos"],
    ["eve.fisher@example.com", "Eve Fisher"],
    ["farah.khan@example.com", "Farah Khan"],
    ["george.miller@example.com", "George Miller"],
    ["hana.suzuki@example.com", "Hana Suzuki"],
    ["ivan.petrov@example.com", "Ivan Petrov"],
    ["julia.rossi@example.com", "Julia Rossi"],
    ["kabir.patel@example.com", "Kabir Patel"],
    ["lena.schmidt@example.com", "Lena Schmidt"]
  ];
  const customers = [];
  for (const [email, name] of customerEmails) {
    const u = await upsertCustomer({ email, password: "Demo@1234", name });
    if (u) customers.push({ id: u.id, email: u.email, name: u.name });
  }
  const demoCustomerUser = await prisma.user.findUnique({
    where: { email: DEMO_ACCOUNTS.customer.email }
  });
  const seedAddress = async (userId, label, fullName, line1, city, state, country, isDefault = false) => {
    const exists = await prisma.address.findFirst({
      where: { userId, label }
    });
    if (exists) return exists;
    return prisma.address.create({
      data: {
        userId,
        type: AddressType.BOTH,
        isDefault,
        label,
        fullName,
        phone: "+15551234567",
        line1,
        city,
        state,
        country,
        postalCode: "94016"
      }
    });
  };
  for (const c of customers) {
    await seedAddress(c.id, "Home", c.name, "123 Market St", "San Francisco", "CA", "US", true);
  }
  if (demoCustomerUser) {
    await seedAddress(
      demoCustomerUser.id,
      "Home",
      DEMO_ACCOUNTS.customer.name,
      "742 Evergreen Terrace",
      "San Francisco",
      "CA",
      "US",
      true
    );
    await seedAddress(
      demoCustomerUser.id,
      "Office",
      DEMO_ACCOUNTS.customer.name,
      "1 Embarcadero Center",
      "San Francisco",
      "CA",
      "US",
      false
    );
  }
  const STATUS_DISTRIBUTION = [
    { order: OrderStatus.DELIVERED, sellerOrder: SellerOrderStatus.DELIVERED, payment: PaymentStatus.PAID, deliveredOffsetDays: 30 },
    { order: OrderStatus.DELIVERED, sellerOrder: SellerOrderStatus.DELIVERED, payment: PaymentStatus.PAID, deliveredOffsetDays: 21 },
    { order: OrderStatus.DELIVERED, sellerOrder: SellerOrderStatus.DELIVERED, payment: PaymentStatus.PAID, deliveredOffsetDays: 14 },
    { order: OrderStatus.DELIVERED, sellerOrder: SellerOrderStatus.DELIVERED, payment: PaymentStatus.PAID, deliveredOffsetDays: 10 },
    { order: OrderStatus.SHIPPED, sellerOrder: SellerOrderStatus.SHIPPED, payment: PaymentStatus.PAID },
    { order: OrderStatus.SHIPPED, sellerOrder: SellerOrderStatus.OUT_FOR_DELIVERY, payment: PaymentStatus.PAID },
    { order: OrderStatus.PROCESSING, sellerOrder: SellerOrderStatus.PROCESSING, payment: PaymentStatus.PAID },
    { order: OrderStatus.PROCESSING, sellerOrder: SellerOrderStatus.PACKED, payment: PaymentStatus.PAID },
    { order: OrderStatus.PAID, sellerOrder: SellerOrderStatus.CONFIRMED, payment: PaymentStatus.PAID },
    { order: OrderStatus.PAID, sellerOrder: SellerOrderStatus.CONFIRMED, payment: PaymentStatus.PAID },
    { order: OrderStatus.PENDING_PAYMENT, sellerOrder: SellerOrderStatus.PENDING, payment: PaymentStatus.UNPAID },
    { order: OrderStatus.CANCELLED, sellerOrder: SellerOrderStatus.CANCELLED, payment: PaymentStatus.FAILED }
  ];
  const orderRecipes = [];
  for (let ci = 0; ci < customers.length; ci++) {
    const customer = customers[ci];
    const addr = await prisma.address.findFirst({
      where: { userId: customer.id }
    });
    if (!addr) continue;
    const ordersForCustomer = ci % 3 + 2;
    for (let oi = 0; oi < ordersForCustomer; oi++) {
      const statusIdx = (ci + oi) % STATUS_DISTRIBUTION.length;
      const itemCount = oi % 3 + 1;
      const pidx = (ci * 3 + oi) % createdProducts.length;
      const productIds = [];
      for (let k = 0; k < itemCount; k++) {
        productIds.push(createdProducts[(pidx + k) % createdProducts.length].id);
      }
      orderRecipes.push({
        userId: customer.id,
        addressId: addr.id,
        statusIdx,
        productIds
      });
    }
  }
  if (demoCustomerUser) {
    const addr = await prisma.address.findFirst({
      where: { userId: demoCustomerUser.id, isDefault: true }
    });
    if (addr) {
      const tripletProductIdx = [0, 4, 8];
      orderRecipes.push({
        userId: demoCustomerUser.id,
        addressId: addr.id,
        statusIdx: 0,
        productIds: [createdProducts[tripletProductIdx[0]].id]
      });
      orderRecipes.push({
        userId: demoCustomerUser.id,
        addressId: addr.id,
        statusIdx: 4,
        productIds: [
          createdProducts[tripletProductIdx[1]].id,
          createdProducts[tripletProductIdx[2]].id
        ]
      });
      orderRecipes.push({
        userId: demoCustomerUser.id,
        addressId: addr.id,
        statusIdx: 1,
        productIds: [createdProducts[2].id]
      });
    }
  }
  console.log(`[demo] generating ${orderRecipes.length} orders\u2026`);
  let orderCounter = await prisma.order.count();
  const createdOrders = [];
  for (const recipe of orderRecipes) {
    orderCounter += 1;
    const orderNumber = `NX-${(/* @__PURE__ */ new Date()).getFullYear()}-${pad(orderCounter)}`;
    const products = await prisma.product.findMany({
      where: { id: { in: recipe.productIds } }
    });
    if (!products.length) continue;
    const groups = /* @__PURE__ */ new Map();
    for (const p of products) {
      const arr = groups.get(p.sellerId) ?? [];
      arr.push(p);
      groups.set(p.sellerId, arr);
    }
    let subtotal = 0;
    const sellerRollups = [];
    for (const [sellerId, ps] of groups) {
      const sub = round2(ps.reduce((s, p) => s + toNumber(p.price), 0));
      const shipping = sub >= 50 ? 0 : 5;
      const tax = round2(sub * 0.08);
      const grand = round2(sub + shipping + tax);
      const commission = round2(sub * 0.1);
      sellerRollups.push({
        sellerId,
        products: ps,
        subtotal: sub,
        shipping,
        tax,
        grandTotal: grand,
        commissionRate: 10,
        commissionAmount: commission,
        payoutAmount: round2(sub - commission)
      });
      subtotal += sub;
    }
    const recipeStatus = STATUS_DISTRIBUTION[recipe.statusIdx];
    const placedAt = new Date(
      Date.now() - ((recipeStatus.deliveredOffsetDays ?? 0) + 1) * 864e5
    );
    const deliveredAt = recipeStatus.deliveredOffsetDays ? new Date(Date.now() - recipeStatus.deliveredOffsetDays * 864e5) : null;
    const grandTotal = round2(
      sellerRollups.reduce((s, r) => s + r.grandTotal, 0)
    );
    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: recipe.userId,
          status: recipeStatus.order,
          fulfillmentStatus: recipeStatus.order === OrderStatus.DELIVERED ? FulfillmentStatus.FULFILLED : FulfillmentStatus.UNFULFILLED,
          paymentStatus: recipeStatus.payment,
          currency: "USD",
          subtotal: round2(subtotal),
          shippingTotal: round2(
            sellerRollups.reduce((s, r) => s + r.shipping, 0)
          ),
          taxTotal: round2(sellerRollups.reduce((s, r) => s + r.tax, 0)),
          discountTotal: 0,
          grandTotal,
          shippingAddressId: recipe.addressId,
          billingAddressId: recipe.addressId,
          placedAt,
          paidAt: recipeStatus.payment === PaymentStatus.PAID ? placedAt : null,
          deliveredAt
        }
      });
      const sellerOrderRows = [];
      let idx = 0;
      for (const r of sellerRollups) {
        idx += 1;
        const so = await tx.sellerOrder.create({
          data: {
            sellerOrderNumber: `${orderNumber}-S${idx}`,
            orderId: order.id,
            sellerId: r.sellerId,
            status: recipeStatus.sellerOrder,
            fulfillmentStatus: recipeStatus.sellerOrder === SellerOrderStatus.DELIVERED ? FulfillmentStatus.FULFILLED : FulfillmentStatus.UNFULFILLED,
            currency: "USD",
            subtotal: r.subtotal,
            shippingTotal: r.shipping,
            taxTotal: r.tax,
            discountTotal: 0,
            grandTotal: r.grandTotal,
            commissionRate: r.commissionRate,
            commissionAmount: r.commissionAmount,
            payoutAmount: r.payoutAmount,
            shippedAt: recipeStatus.sellerOrder === SellerOrderStatus.SHIPPED || recipeStatus.sellerOrder === SellerOrderStatus.OUT_FOR_DELIVERY || recipeStatus.sellerOrder === SellerOrderStatus.DELIVERED ? new Date(placedAt.getTime() + 864e5) : null,
            deliveredAt: recipeStatus.sellerOrder === SellerOrderStatus.DELIVERED ? deliveredAt : null
          }
        });
        sellerOrderRows.push({
          id: so.id,
          sellerId: r.sellerId,
          subtotal: r.subtotal
        });
        for (const p of r.products) {
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              sellerOrderId: so.id,
              sellerId: r.sellerId,
              productId: p.id,
              productName: p.name,
              sku: p.sku,
              unitPrice: p.price,
              quantity: 1,
              lineSubtotal: p.price,
              lineDiscount: 0,
              lineTotal: p.price
            }
          });
        }
        await tx.sellerOrderStatusHistory.create({
          data: {
            sellerOrderId: so.id,
            toStatus: recipeStatus.sellerOrder,
            note: "Demo seed"
          }
        });
      }
      if (recipeStatus.payment !== PaymentStatus.UNPAID) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            method: "STRIPE",
            status: recipeStatus.payment,
            currency: "USD",
            amount: grandTotal,
            paidAt: placedAt,
            stripePaymentIntentId: `pi_demo_${order.id.slice(0, 12)}`
          }
        });
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          toStatus: recipeStatus.order,
          note: "Demo seed"
        }
      });
      for (const r of sellerRollups) {
        await tx.seller.update({
          where: { id: r.sellerId },
          data: {
            orderCount: { increment: 1 },
            totalSales: recipeStatus.payment === PaymentStatus.PAID ? { increment: r.subtotal } : void 0
          }
        });
        for (const p of r.products) {
          await tx.product.update({
            where: { id: p.id },
            data: {
              soldCount: recipeStatus.payment === PaymentStatus.PAID ? { increment: 1 } : void 0,
              viewCount: { increment: Math.floor(Math.random() * 10) + 1 }
            }
          });
        }
      }
      if (recipeStatus.sellerOrder === SellerOrderStatus.DELIVERED) {
        for (const so of sellerOrderRows) {
          const r = sellerRollups.find((x) => x.sellerId === so.sellerId);
          await tx.sellerPayoutItem.create({
            data: {
              sellerOrderId: so.id,
              grossAmount: r.subtotal,
              commissionAmount: r.commissionAmount,
              refundAmount: 0,
              netAmount: r.payoutAmount
            }
          });
        }
      }
      return { order, sellerOrderRows };
    });
    createdOrders.push({
      id: created.order.id,
      orderNumber: created.order.orderNumber,
      userId: recipe.userId,
      grandTotal,
      sellerOrders: created.sellerOrderRows,
      status: recipeStatus.order,
      productIds: recipe.productIds
    });
  }
  const reviewable = createdOrders.filter(
    (o) => o.status === OrderStatus.DELIVERED
  );
  for (let i = 0; i < Math.min(reviewable.length, 10); i++) {
    const order = reviewable[i];
    const items = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      take: 1
    });
    if (!items.length) continue;
    const it = items[0];
    const exists = await prisma.review.findFirst({
      where: { userId: order.userId, orderItemId: it.id }
    });
    if (exists) continue;
    await prisma.review.create({
      data: {
        productId: it.productId,
        userId: order.userId,
        orderItemId: it.id,
        rating: i % 3 + 3,
        // 3..5
        title: i % 2 === 0 ? "Great purchase" : "Loving it so far",
        comment: i % 2 === 0 ? "Arrived quickly, build quality is excellent." : "Exactly as described. Would buy again.",
        status: ReviewStatus.APPROVED,
        helpfulCount: Math.floor(Math.random() * 30)
      }
    }).catch(() => null);
    await prisma.product.update({
      where: { id: it.productId },
      data: {
        reviewCount: { increment: 1 }
      }
    }).catch(() => null);
  }
  await prisma.$executeRawUnsafe(`
    UPDATE products p
    SET "avgRating" = sub.avg_rating
    FROM (
      SELECT "productId", ROUND(AVG(rating)::numeric, 2) AS avg_rating
      FROM reviews
      WHERE status = 'APPROVED'
      GROUP BY "productId"
    ) sub
    WHERE p.id = sub."productId"
  `);
  const qaProductSamples = createdProducts.slice(0, 6);
  for (let i = 0; i < qaProductSamples.length; i++) {
    const p = qaProductSamples[i];
    const asker = customers[i % customers.length];
    if (!asker) continue;
    const exists = await prisma.productQuestion.findFirst({
      where: { productId: p.id, userId: asker.id }
    });
    if (exists) continue;
    const q = await prisma.productQuestion.create({
      data: {
        productId: p.id,
        userId: asker.id,
        question: [
          "Is this compatible with macOS Sonoma?",
          "Does it ship to Canada?",
          "What's the warranty period?",
          "Is the case included?",
          "Battery life on a single charge?",
          "Can I pair it with two devices at once?"
        ][i]
      }
    });
    if (i % 2 === 0) {
      const sellerUser = allSellers.find((s) => s.sellerId === p.sellerId);
      await prisma.productAnswer.create({
        data: {
          questionId: q.id,
          userId: sellerUser.userId,
          answer: "Yes \u2014 confirmed by our team. Reach out if you have more questions!",
          isOfficial: true
        }
      });
      await prisma.productQuestion.update({
        where: { id: q.id },
        data: { isAnswered: true }
      });
    }
  }
  if (demoCustomerUser) {
    const p = createdProducts[0];
    const exists = await prisma.productQuestion.findFirst({
      where: { productId: p.id, userId: demoCustomerUser.id }
    });
    if (!exists) {
      await prisma.productQuestion.create({
        data: {
          productId: p.id,
          userId: demoCustomerUser.id,
          question: "Does this come with a US power adapter?"
        }
      });
    }
  }
  const refundCandidates = createdOrders.filter(
    (o) => o.status === OrderStatus.DELIVERED && o.sellerOrders.length > 0
  );
  const seedRefund = async (orderId, sellerOrderId, sellerId, requestedById, refundStatus, counter) => {
    const exists = await prisma.refund.findFirst({
      where: { orderId, sellerOrderId }
    });
    if (exists) return;
    const items = await prisma.orderItem.findMany({
      where: { sellerOrderId },
      take: 1
    });
    if (!items.length) return;
    const it = items[0];
    const amount = toNumber(it.unitPrice);
    const refundNumber = `RF-${(/* @__PURE__ */ new Date()).getFullYear()}-${pad(counter)}`;
    await prisma.refund.create({
      data: {
        refundNumber,
        orderId,
        sellerOrderId,
        sellerId,
        requestedById,
        status: refundStatus,
        reason: RefundReason.DEFECTIVE,
        customerNote: "Item arrived with a small defect.",
        currency: "USD",
        requestedAmount: amount,
        approvedAmount: refundStatus === RefundStatus.REQUESTED ? null : amount,
        refundedAmount: refundStatus === RefundStatus.COMPLETED ? amount : 0,
        decidedAt: refundStatus === RefundStatus.REQUESTED ? null : /* @__PURE__ */ new Date(),
        completedAt: refundStatus === RefundStatus.COMPLETED ? /* @__PURE__ */ new Date() : null,
        items: {
          create: [
            {
              orderItemId: it.id,
              quantity: 1,
              amount
            }
          ]
        }
      }
    });
  };
  let refundCounter = await prisma.refund.count();
  for (let i = 0; i < Math.min(refundCandidates.length, 4); i++) {
    refundCounter += 1;
    const order = refundCandidates[i];
    const so = order.sellerOrders[0];
    const statuses = [
      RefundStatus.REQUESTED,
      RefundStatus.APPROVED,
      RefundStatus.COMPLETED,
      RefundStatus.REJECTED
    ];
    await seedRefund(
      order.id,
      so.id,
      so.sellerId,
      order.userId,
      statuses[i % statuses.length],
      refundCounter
    );
  }
  if (demoCustomerUser) {
    refundCounter += 1;
    const dcOrder = createdOrders.filter((o) => o.userId === demoCustomerUser.id).pop();
    if (dcOrder && dcOrder.sellerOrders.length) {
      const so = dcOrder.sellerOrders[0];
      await seedRefund(
        dcOrder.id,
        so.id,
        so.sellerId,
        demoCustomerUser.id,
        RefundStatus.REQUESTED,
        refundCounter
      );
    }
  }
  const payoutStatusCycle = [
    PayoutStatus.PENDING,
    PayoutStatus.PROCESSING,
    PayoutStatus.PAID,
    PayoutStatus.FAILED
  ];
  let psIdx = 0;
  for (const seller of allSellers) {
    const unpaidItems = await prisma.sellerPayoutItem.findMany({
      where: {
        payoutId: null,
        sellerOrder: { sellerId: seller.sellerId }
      }
    });
    if (unpaidItems.length === 0) continue;
    const gross = round2(unpaidItems.reduce((s, i) => s + toNumber(i.grossAmount), 0));
    const commission = round2(
      unpaidItems.reduce((s, i) => s + toNumber(i.commissionAmount), 0)
    );
    const net = round2(unpaidItems.reduce((s, i) => s + toNumber(i.netAmount), 0));
    const status5 = payoutStatusCycle[psIdx % payoutStatusCycle.length];
    psIdx += 1;
    const payout = await prisma.sellerPayout.create({
      data: {
        sellerId: seller.sellerId,
        periodStart: new Date(Date.now() - 30 * 864e5),
        periodEnd: /* @__PURE__ */ new Date(),
        currency: "USD",
        grossAmount: gross,
        commissionAmount: commission,
        refundAmount: 0,
        adjustmentAmount: 0,
        netAmount: net,
        method: PayoutMethod.MANUAL_BANK,
        status: status5,
        paidAt: status5 === PayoutStatus.PAID ? /* @__PURE__ */ new Date() : null,
        failureReason: status5 === PayoutStatus.FAILED ? "Demo: Bank rejected the wire" : null,
        bankReference: status5 === PayoutStatus.PAID ? `WIRE-${pad(psIdx)}` : null
      }
    });
    await prisma.sellerPayoutItem.updateMany({
      where: { id: { in: unpaidItems.map((i) => i.id) } },
      data: { payoutId: payout.id }
    });
  }
  if (demoCustomerUser) {
    const wl = await prisma.wishlist.upsert({
      where: { userId: demoCustomerUser.id },
      update: {},
      create: { userId: demoCustomerUser.id }
    });
    for (let i = 0; i < 5; i++) {
      const p = createdProducts[i * 3 % createdProducts.length];
      await prisma.wishlistItem.upsert({
        where: {
          wishlistId_productId: { wishlistId: wl.id, productId: p.id }
        },
        update: {},
        create: { wishlistId: wl.id, productId: p.id }
      }).catch(() => null);
    }
    const existingCart = await prisma.cart.findFirst({
      where: { userId: demoCustomerUser.id, status: CartStatus.ACTIVE }
    });
    let cartId = existingCart?.id;
    if (!cartId) {
      const cart = await prisma.cart.create({
        data: { userId: demoCustomerUser.id, status: CartStatus.ACTIVE }
      });
      cartId = cart.id;
    }
    const cartProducts = [createdProducts[1], createdProducts[3]];
    for (const p of cartProducts) {
      await prisma.cartItem.upsert({
        where: {
          cartId_productId_variantId: {
            cartId,
            productId: p.id,
            variantId: null
            // unique tuple — Prisma encodes null
          }
        },
        update: {},
        create: {
          cartId,
          productId: p.id,
          quantity: 1,
          unitPrice: p.price
        }
      }).catch(() => null);
    }
  }
  if (demoCustomerUser) {
    await prisma.notification.createMany({
      data: [
        {
          userId: demoCustomerUser.id,
          type: NotificationType.ORDER_DELIVERED,
          title: "Your order was delivered",
          message: "Hope you love your new gear! Leave a review to help others.",
          actionUrl: "/account/orders"
        },
        {
          userId: demoCustomerUser.id,
          type: NotificationType.PROMO,
          title: "Use code NEXORA10 for 10% off",
          message: "Save on any order over $50.",
          actionUrl: "/shop"
        }
      ],
      skipDuplicates: true
    });
  }
  await prisma.notification.createMany({
    data: [
      {
        userId: demoShopSeller.userId,
        type: NotificationType.NEW_SELLER_ORDER,
        title: "New orders this week",
        message: "You have multiple new orders waiting to be packed.",
        actionUrl: "/seller/orders"
      },
      {
        userId: demoShopSeller.userId,
        type: NotificationType.LOW_STOCK,
        title: "Low stock alert",
        message: "Some of your products are running low.",
        actionUrl: "/seller/products?filter=low-stock"
      }
    ],
    skipDuplicates: true
  });
  console.log(
    `[demo] seeded ${createdProducts.length} products, ${createdOrders.length} orders, ${customers.length} extra customers`
  );
};

// src/server.ts
var httpServer = createServer(app_default);
var isShuttingDown = false;
var shutdown = async (signal, exitCode = 0) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully...`);
  if (httpServer.listening) {
    try {
      await new Promise((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    } catch (error) {
      console.error("Failed to close HTTP server cleanly:", error);
      exitCode = 1;
    }
  }
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error("Failed to disconnect Prisma cleanly:", error);
    exitCode = 1;
  }
  process.exit(exitCode);
};
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  if (envVars.NODE_ENV === "development") {
    return;
  }
  void shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  void shutdown("uncaughtException", 1);
});
var bootstrap = async () => {
  const port = Number(envVars.PORT);
  try {
    await connectPrismaWithRetry({ retries: 5, retryDelayMs: 2e3 });
    await seedAdmin();
    await seedDemoAccounts();
    await seedComprehensiveDemoData().catch((err) => {
      console.error("[demo] comprehensive seed failed:", err?.message ?? err);
    });
    await new Promise((resolve, reject) => {
      httpServer.once("error", reject);
      httpServer.listen(port, () => {
        httpServer.off("error", reject);
        console.log(`Server is running on http://localhost:${port}`);
        resolve();
      });
    });
  } catch (error) {
    const startupError = error;
    if (startupError.code === "EADDRINUSE") {
      console.error(
        `Port ${port} is already in use. Stop the existing process or change PORT in .env.`
      );
    } else {
      console.error("Failed to start server:", error);
    }
    await prisma.$disconnect().catch(() => null);
    process.exit(1);
  }
};
bootstrap();
