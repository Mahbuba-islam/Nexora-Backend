/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  KycStatus,
  NotificationType,
  PayoutMethod,
  Role,
  SellerStatus,
  UserStatus,
} from "../../generated/enums";
import { slugify } from "../../utilis/stringUtils";
import { QueryBuilder } from "../../utilis/queryBuilder";
import { notificationService } from "../notification/notification.service";
import type {
  IAdminApproveSeller,
  IAdminRejectSeller,
  IAdminSuspendSeller,
  IAdminUpdateSeller,
  IApplyAsSeller,
  IUpdateMyShop,
} from "./seller.validation";

/* -------------------------------------------------------------- */
/*  Helpers                                                       */
/* -------------------------------------------------------------- */

const ensureUniqueShopSlug = async (base: string, ignoreId?: string) => {
  let slug = base || "shop";
  let i = 1;
  // 25 attempts is overkill but cheap & bounded.
  for (let attempt = 0; attempt < 25; attempt++) {
    const existing = await prisma.seller.findUnique({ where: { shopSlug: slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${++i}`;
  }
  throw new AppError(status.CONFLICT, "Could not generate a unique shop slug");
};

const notifyAllAdmins = async (
  type: NotificationType,
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: Record<string, unknown>
) => {
  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN, isDeleted: false },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await notificationService.createNotificationsForUsers(
    admins.map((a) => a.id),
    { type, title, message, actionUrl, metadata }
  );
};

/* -------------------------------------------------------------- */
/*  Public storefront (no auth)                                   */
/* -------------------------------------------------------------- */

const listPublicShops = async (queryParams: Record<string, any>) => {
  const qb = new QueryBuilder(
    prisma.seller as any,
    queryParams,
    {
      searchableFields: ["shopName", "tagline", "description"],
      filterableFields: ["country", "businessType"],
    }
  );

  const baseWhere = {
    status: SellerStatus.APPROVED,
    isDeleted: false,
  };

  // Inject base filter on top of QueryBuilder where
  qb.search().filter().sort().paginate();
  const built = (qb as any).getQuery();
  built.where = { ...baseWhere, ...(built.where ?? {}) };
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
    createdAt: true,
  };

  const [data, total] = await Promise.all([
    prisma.seller.findMany(built),
    prisma.seller.count({ where: built.where }),
  ]);

  return {
    data,
    meta: {
      page: Number(queryParams.page) || 1,
      limit: Number(queryParams.limit) || 10,
      total,
      totalPages: Math.ceil(total / (Number(queryParams.limit) || 10)),
    },
  };
};

const getPublicShopBySlug = async (slug: string) => {
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
      createdAt: true,
    },
  });
  if (!seller) throw new AppError(status.NOT_FOUND, "Shop not found");
  return seller;
};

/* -------------------------------------------------------------- */
/*  Self-service: apply, view, update                             */
/* -------------------------------------------------------------- */

const applyAsSeller = async (userId: string, payload: IApplyAsSeller) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { seller: true },
  });
  if (!user) throw new AppError(status.NOT_FOUND, "User not found");
  if (user.isDeleted || user.status !== UserStatus.ACTIVE) {
    throw new AppError(status.FORBIDDEN, "Account is not eligible to apply");
  }
  if (user.seller) {
    throw new AppError(
      status.CONFLICT,
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
      payoutMethod: (payload.payoutMethod ?? PayoutMethod.MANUAL_BANK) as PayoutMethod,
      bankAccountHolderName: payload.bankAccountHolderName,
      bankAccountNumber: payload.bankAccountNumber,
      bankRoutingNumber: payload.bankRoutingNumber,
      bankName: payload.bankName,
      bankCountry: payload.bankCountry,
      status: SellerStatus.PENDING,
      kycStatus: KycStatus.NOT_SUBMITTED,
      applicationData: payload as any,
    },
  });

  // Notify the applicant
  await notificationService.createNotification({
    userId,
    type: NotificationType.SELLER_APPLICATION_RECEIVED,
    title: "Seller application received",
    message: `Thanks! We've received your application for "${seller.shopName}" and will review it shortly.`,
    actionUrl: "/seller/dashboard",
  });

  // Notify all admins
  await notifyAllAdmins(
    NotificationType.NEW_SELLER_APPLICATION,
    "New seller application",
    `${user.name} applied to open shop "${seller.shopName}".`,
    `/admin/sellers/${seller.id}`,
    { sellerId: seller.id, userId }
  );

  return seller;
};

const getMySeller = async (userId: string) => {
  const seller = await prisma.seller.findUnique({ where: { userId } });
  if (!seller) throw new AppError(status.NOT_FOUND, "You don't have a seller profile yet");
  return seller;
};

const updateMyShop = async (userId: string, payload: IUpdateMyShop) => {
  const seller = await prisma.seller.findUnique({ where: { userId } });
  if (!seller) throw new AppError(status.NOT_FOUND, "You don't have a seller profile");
  if (seller.isDeleted) throw new AppError(status.GONE, "Seller profile is closed");
  if (seller.status === SellerStatus.SUSPENDED) {
    throw new AppError(status.FORBIDDEN, "Your shop is suspended");
  }

  const data: Record<string, unknown> = { ...payload };
  if (payload.shopName && payload.shopName !== seller.shopName) {
    data.shopSlug = await ensureUniqueShopSlug(slugify(payload.shopName), seller.id);
  }

  return prisma.seller.update({ where: { id: seller.id }, data });
};

/* -------------------------------------------------------------- */
/*  Admin: list / inspect / approve / reject / suspend            */
/* -------------------------------------------------------------- */

const adminListSellers = async (queryParams: Record<string, any>) => {
  const qb = new QueryBuilder(prisma.seller as any, queryParams, {
    searchableFields: ["shopName", "shopSlug", "contactEmail", "legalName"],
    filterableFields: ["status", "kycStatus", "country", "isDeleted"],
  });

  qb.search().filter().sort().paginate();
  const built = (qb as any).getQuery();
  built.include = {
    user: { select: { id: true, name: true, email: true, status: true } },
  };

  const [data, total] = await Promise.all([
    prisma.seller.findMany(built),
    prisma.seller.count({ where: built.where }),
  ]);

  return {
    data,
    meta: {
      page: Number(queryParams.page) || 1,
      limit: Number(queryParams.limit) || 10,
      total,
      totalPages: Math.ceil(total / (Number(queryParams.limit) || 10)),
    },
  };
};

const adminGetSeller = async (id: string) => {
  const seller = await prisma.seller.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, status: true } },
      _count: { select: { products: true, sellerOrders: true, payouts: true } },
    },
  });
  if (!seller) throw new AppError(status.NOT_FOUND, "Seller not found");
  return seller;
};

const adminApproveSeller = async (
  id: string,
  adminUserId: string,
  payload: IAdminApproveSeller
) => {
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) throw new AppError(status.NOT_FOUND, "Seller not found");
  if (seller.status === SellerStatus.APPROVED) {
    throw new AppError(status.CONFLICT, "Seller is already approved");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.seller.update({
      where: { id },
      data: {
        status: SellerStatus.APPROVED,
        rejectionReason: null,
        suspensionReason: null,
        approvedAt: new Date(),
        approvedById: adminUserId,
        commissionRate: payload.commissionRate ?? seller.commissionRate ?? null,
      },
    });

    await tx.user.update({
      where: { id: seller.userId },
      data: { role: Role.SELLER },
    });

    return s;
  });

  await notificationService.createNotification({
    userId: seller.userId,
    type: NotificationType.SELLER_APPROVED,
    title: "Your shop is live",
    message: `Congratulations! "${seller.shopName}" has been approved. You can now list products.`,
    actionUrl: "/seller/dashboard",
  });

  return updated;
};

const adminRejectSeller = async (
  id: string,
  _adminUserId: string,
  payload: IAdminRejectSeller
) => {
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) throw new AppError(status.NOT_FOUND, "Seller not found");
  if (seller.status === SellerStatus.APPROVED) {
    throw new AppError(
      status.CONFLICT,
      "Seller is already approved. Use suspend instead."
    );
  }

  const updated = await prisma.seller.update({
    where: { id },
    data: {
      status: SellerStatus.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: payload.reason,
    },
  });

  await notificationService.createNotification({
    userId: seller.userId,
    type: NotificationType.SELLER_REJECTED,
    title: "Seller application rejected",
    message: payload.reason,
    actionUrl: "/seller/apply",
  });

  return updated;
};

const adminSuspendSeller = async (
  id: string,
  _adminUserId: string,
  payload: IAdminSuspendSeller
) => {
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) throw new AppError(status.NOT_FOUND, "Seller not found");

  const updated = await prisma.seller.update({
    where: { id },
    data: {
      status: SellerStatus.SUSPENDED,
      suspendedAt: new Date(),
      suspensionReason: payload.reason,
    },
  });

  // Hide all of the seller's products from public storefront.
  await prisma.product.updateMany({
    where: { sellerId: id, isDeleted: false },
    data: { status: "ARCHIVED" },
  });

  await notificationService.createNotification({
    userId: seller.userId,
    type: NotificationType.SELLER_SUSPENDED,
    title: "Your shop has been suspended",
    message: payload.reason,
    actionUrl: "/seller/dashboard",
  });

  return updated;
};

const adminReinstateSeller = async (id: string, _adminUserId: string) => {
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) throw new AppError(status.NOT_FOUND, "Seller not found");
  if (seller.status !== SellerStatus.SUSPENDED) {
    throw new AppError(status.CONFLICT, "Seller is not suspended");
  }
  return prisma.seller.update({
    where: { id },
    data: {
      status: SellerStatus.APPROVED,
      suspensionReason: null,
      suspendedAt: null,
    },
  });
};

/* -------------------------------------------------------------- */
/*  Admin: detail w/ KPIs, edit, soft-delete                      */
/* -------------------------------------------------------------- */

const adminGetSellerDetail = async (id: string) => {
  const seller = await prisma.seller.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: { products: true, sellerOrders: true, payouts: true },
      },
    },
  });
  if (!seller) throw new AppError(status.NOT_FOUND, "Seller not found");

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const last30 = new Date(Date.now() - 30 * 86400_000);

  const [paidAgg, monthAgg, last30Agg, pendingPayouts, paidPayouts, lowStockCount, refundCount] =
    await Promise.all([
      prisma.sellerOrder.aggregate({
        where: { sellerId: id, order: { paymentStatus: "PAID" } },
        _sum: { grandTotal: true, commissionAmount: true, payoutAmount: true },
        _count: true,
      }),
      prisma.sellerOrder.aggregate({
        where: {
          sellerId: id,
          order: { paymentStatus: "PAID" },
          createdAt: { gte: startOfMonth },
        },
        _sum: { grandTotal: true, payoutAmount: true },
      }),
      prisma.sellerOrder.aggregate({
        where: {
          sellerId: id,
          createdAt: { gte: last30 },
        },
        _count: true,
      }),
      prisma.sellerPayout.aggregate({
        where: { sellerId: id, status: { in: ["PENDING", "PROCESSING"] } },
        _sum: { netAmount: true },
        _count: true,
      }),
      prisma.sellerPayout.aggregate({
        where: { sellerId: id, status: "PAID" },
        _sum: { netAmount: true },
        _count: true,
      }),
      prisma.product.count({
        where: {
          sellerId: id,
          isDeleted: false,
          trackInventory: true,
          stock: { lte: 5 },
        },
      }),
      prisma.refund.count({ where: { sellerId: id } }),
    ]);

  return {
    seller,
    kpis: {
      paidOrders: paidAgg._count,
      gmv: Number(paidAgg._sum.grandTotal ?? 0),
      commission: Number(paidAgg._sum.commissionAmount ?? 0),
      sellerEarnings: Number(paidAgg._sum.payoutAmount ?? 0),
      monthGmv: Number(monthAgg._sum.grandTotal ?? 0),
      monthEarnings: Number(monthAgg._sum.payoutAmount ?? 0),
      ordersLast30Days: last30Agg._count,
      pendingPayouts: {
        count: pendingPayouts._count,
        amount: Number(pendingPayouts._sum.netAmount ?? 0),
      },
      paidPayouts: {
        count: paidPayouts._count,
        amount: Number(paidPayouts._sum.netAmount ?? 0),
      },
      lowStockCount,
      refundCount,
    },
  };
};

const adminUpdateSeller = async (id: string, payload: IAdminUpdateSeller) => {
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) throw new AppError(status.NOT_FOUND, "Seller not found");

  const data: Record<string, unknown> = {};
  if (payload.shopName && payload.shopName !== seller.shopName) {
    data.shopName = payload.shopName;
    data.shopSlug = await ensureUniqueShopSlug(slugify(payload.shopName), seller.id);
  }
  for (const k of [
    "tagline",
    "description",
    "commissionRate",
    "kycStatus",
    "contactEmail",
    "contactPhone",
  ] as const) {
    if (payload[k] !== undefined) data[k] = payload[k];
  }

  return prisma.seller.update({ where: { id }, data });
};

const adminSoftDeleteSeller = async (id: string) => {
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) throw new AppError(status.NOT_FOUND, "Seller not found");
  if (seller.isDeleted) {
    throw new AppError(status.CONFLICT, "Seller is already deleted");
  }

  await prisma.$transaction(async (tx) => {
    await tx.seller.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: SellerStatus.SUSPENDED,
      },
    });
    await tx.product.updateMany({
      where: { sellerId: id, isDeleted: false },
      data: { status: "ARCHIVED" },
    });
  });

  await notificationService
    .createNotification({
      userId: seller.userId,
      type: NotificationType.SELLER_SUSPENDED,
      title: "Your shop has been closed",
      message:
        "Your seller account was closed by the platform. Contact support if you believe this was a mistake.",
    })
    .catch(() => null);

  return { id, deleted: true };
};

/* -------------------------------------------------------------- */
/*  Seller dashboard (scoped to authenticated seller)             */
/* -------------------------------------------------------------- */

const getMyDashboard = async (userId: string) => {
  const seller = await prisma.seller.findUnique({ where: { userId } });
  if (!seller) throw new AppError(status.NOT_FOUND, "Seller profile not found");

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    productCount,
    activeProductCount,
    lowStockProductCount,
    pendingSellerOrders,
    monthSellerOrders,
    monthSales,
    pendingPayout,
    paidPayout,
  ] = await Promise.all([
    prisma.product.count({ where: { sellerId: seller.id, isDeleted: false } }),
    prisma.product.count({
      where: { sellerId: seller.id, isDeleted: false, status: "ACTIVE" },
    }),
    prisma.product.count({
      where: {
        sellerId: seller.id,
        isDeleted: false,
        trackInventory: true,
        stock: { lte: 5 },
      },
    }),
    prisma.sellerOrder.count({
      where: { sellerId: seller.id, status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } },
    }),
    prisma.sellerOrder.count({
      where: { sellerId: seller.id, createdAt: { gte: startOfMonth } },
    }),
    prisma.sellerOrder.aggregate({
      where: {
        sellerId: seller.id,
        status: { in: ["DELIVERED"] },
        createdAt: { gte: startOfMonth },
      },
      _sum: { payoutAmount: true },
    }),
    prisma.sellerPayout.aggregate({
      where: { sellerId: seller.id, status: { in: ["PENDING", "PROCESSING"] } },
      _sum: { netAmount: true },
    }),
    prisma.sellerPayout.aggregate({
      where: { sellerId: seller.id, status: "PAID" },
      _sum: { netAmount: true },
    }),
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
      totalSales: seller.totalSales,
    },
    products: {
      total: productCount,
      active: activeProductCount,
      lowStock: lowStockProductCount,
    },
    orders: {
      pending: pendingSellerOrders,
      thisMonth: monthSellerOrders,
    },
    revenue: {
      thisMonth: monthSales._sum.payoutAmount ?? 0,
      pendingPayout: pendingPayout._sum.netAmount ?? 0,
      paidPayout: paidPayout._sum.netAmount ?? 0,
    },
  };
};

export const sellerService = {
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
  adminGetSellerDetail,
  adminUpdateSeller,
  adminSoftDeleteSeller,
  adminApproveSeller,
  adminRejectSeller,
  adminSuspendSeller,
  adminReinstateSeller,
};
