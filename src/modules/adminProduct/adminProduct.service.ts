/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin product management service.
 *
 * Powers the admin dashboard "Products" page. Unlike the public/seller
 * product service, this one:
 *   - sees DELETED + ARCHIVED + DRAFT products
 *   - supports bulk operations
 *   - exposes per-product KPIs (revenue, units sold, refund rate)
 *   - allows force restore / hard delete
 */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  PaymentStatus,
  ProductStatus,
} from "../../generated/enums";
import { toNumber } from "../../utilis/stringUtils";

interface ListQuery {
  search?: string;
  status?: ProductStatus | "ALL";
  sellerId?: string;
  categoryId?: string;
  brandId?: string;
  isDeleted?: "true" | "false" | "all";
  lowStock?: "true";
  outOfStock?: "true";
  isFeatured?: "true";
  isBestseller?: "true";
  minPrice?: string;
  maxPrice?: string;
  sortBy?: "createdAt" | "price" | "soldCount" | "stock" | "viewCount" | "avgRating";
  sortOrder?: "asc" | "desc";
  page?: string;
  limit?: string;
}

const list = async (q: ListQuery) => {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
  const skip = (page - 1) * limit;

  const where: any = {};

  // Soft-delete visibility — admin sees all by default
  if (q.isDeleted === "true") where.isDeleted = true;
  else if (q.isDeleted === "false") where.isDeleted = false;
  // "all" or undefined → no filter

  if (q.status && q.status !== "ALL") where.status = q.status;
  if (q.sellerId) where.sellerId = q.sellerId;
  if (q.categoryId) where.categoryId = q.categoryId;
  if (q.brandId) where.brandId = q.brandId;
  if (q.isFeatured === "true") where.isFeatured = true;
  if (q.isBestseller === "true") where.isBestseller = true;
  if (q.outOfStock === "true") where.stock = { lte: 0 };
  // lowStock handled below via raw filter (column-vs-column)
  if (q.minPrice || q.maxPrice) {
    where.price = {};
    if (q.minPrice) where.price.gte = Number(q.minPrice);
    if (q.maxPrice) where.price.lte = Number(q.maxPrice);
  }
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: "insensitive" } },
      { sku: { contains: q.search, mode: "insensitive" } },
      { slug: { contains: q.search, mode: "insensitive" } },
    ];
  }

  // Low-stock requires comparing two columns. Use raw to fetch ids first.
  let lowStockIds: string[] | null = null;
  if (q.lowStock === "true") {
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM products WHERE "trackInventory" = true AND stock <= "lowStockAlert" AND "isDeleted" = false`
    );
    lowStockIds = rows.map((r) => r.id);
    if (lowStockIds.length === 0) {
      return {
        data: [],
        meta: { page, limit, total: 0, totalPages: 0 },
      };
    }
    where.id = { in: lowStockIds };
  }

  const sortBy = q.sortBy ?? "createdAt";
  const sortOrder = q.sortOrder ?? "desc";

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        brand: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        seller: {
          select: {
            id: true,
            shopName: true,
            shopSlug: true,
            status: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getDetail = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      specifications: { orderBy: { sortOrder: "asc" } },
      tags: true,
      brand: true,
      category: true,
      seller: {
        select: {
          id: true,
          shopName: true,
          shopSlug: true,
          status: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
      _count: {
        select: {
          orderItems: true,
          reviews: true,
          questions: true,
        },
      },
    },
  });
  if (!product) throw new AppError(status.NOT_FOUND, "Product not found");

  // Sales aggregates (paid orders only)
  const items = await prisma.orderItem.findMany({
    where: {
      productId: id,
      order: { paymentStatus: PaymentStatus.PAID },
    },
    select: { quantity: true, lineTotal: true },
  });
  const unitsSold = items.reduce((s, i) => s + i.quantity, 0);
  const revenue = items.reduce((s, i) => s + toNumber(i.lineTotal), 0);

  const refundCount = await prisma.refundItem.count({
    where: { orderItem: { productId: id } },
  });

  return {
    ...product,
    stats: {
      unitsSold,
      revenue: Math.round(revenue * 100) / 100,
      refundCount,
      refundRate: unitsSold > 0 ? Math.round((refundCount / unitsSold) * 10000) / 100 : 0,
    },
  };
};

const update = async (id: string, payload: Record<string, any>) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError(status.NOT_FOUND, "Product not found");

  // Whitelist only safe-to-edit fields. Slug/SKU updates intentionally skipped.
  const allowed = [
    "name",
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
    "status",
    "condition",
    "isFeatured",
    "isBestseller",
    "isNewArrival",
    "isOnSale",
    "metaTitle",
    "metaDescription",
    "brandId",
    "categoryId",
  ];
  const data: any = {};
  for (const k of allowed) {
    if (payload[k] !== undefined) data[k] = payload[k];
  }

  if (
    payload.status === ProductStatus.ACTIVE &&
    !existing.publishedAt
  ) {
    data.publishedAt = new Date();
  }

  return prisma.product.update({ where: { id }, data });
};

const softDelete = async (id: string) => {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, sellerId: true, isDeleted: true },
  });
  if (!existing) throw new AppError(status.NOT_FOUND, "Product not found");
  if (existing.isDeleted) {
    throw new AppError(status.CONFLICT, "Product is already deleted");
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: ProductStatus.ARCHIVED,
      },
    });
    await tx.seller.update({
      where: { id: existing.sellerId },
      data: { productCount: { decrement: 1 } },
    }).catch(() => null);
  });

  return { id, deleted: true };
};

const restore = async (id: string) => {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, sellerId: true, isDeleted: true },
  });
  if (!existing) throw new AppError(status.NOT_FOUND, "Product not found");
  if (!existing.isDeleted) {
    throw new AppError(status.CONFLICT, "Product is not deleted");
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        status: ProductStatus.DRAFT,
      },
    });
    await tx.seller.update({
      where: { id: existing.sellerId },
      data: { productCount: { increment: 1 } },
    }).catch(() => null);
  });

  return { id, restored: true };
};

const hardDelete = async (id: string) => {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, _count: { select: { orderItems: true } } },
  });
  if (!existing) throw new AppError(status.NOT_FOUND, "Product not found");
  if (existing._count.orderItems > 0) {
    throw new AppError(
      status.CONFLICT,
      "Cannot hard-delete a product with order history. Use soft-delete instead."
    );
  }
  await prisma.product.delete({ where: { id } });
  return { id, hardDeleted: true };
};

interface BulkPayload {
  ids: string[];
  action:
    | "archive"
    | "activate"
    | "draft"
    | "feature"
    | "unfeature"
    | "bestseller"
    | "unbestseller"
    | "delete"
    | "restore";
}

const bulk = async (payload: BulkPayload) => {
  if (!payload.ids?.length) {
    throw new AppError(status.BAD_REQUEST, "ids[] is required");
  }
  const where = { id: { in: payload.ids } };

  switch (payload.action) {
    case "archive":
      return prisma.product.updateMany({
        where,
        data: { status: ProductStatus.ARCHIVED },
      });
    case "activate":
      return prisma.product.updateMany({
        where,
        data: { status: ProductStatus.ACTIVE, publishedAt: new Date() },
      });
    case "draft":
      return prisma.product.updateMany({
        where,
        data: { status: ProductStatus.DRAFT },
      });
    case "feature":
      return prisma.product.updateMany({ where, data: { isFeatured: true } });
    case "unfeature":
      return prisma.product.updateMany({ where, data: { isFeatured: false } });
    case "bestseller":
      return prisma.product.updateMany({ where, data: { isBestseller: true } });
    case "unbestseller":
      return prisma.product.updateMany({ where, data: { isBestseller: false } });
    case "delete":
      return prisma.product.updateMany({
        where,
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          status: ProductStatus.ARCHIVED,
        },
      });
    case "restore":
      return prisma.product.updateMany({
        where,
        data: { isDeleted: false, deletedAt: null, status: ProductStatus.DRAFT },
      });
    default:
      throw new AppError(status.BAD_REQUEST, "Unknown bulk action");
  }
};

export const adminProductService = {
  list,
  getDetail,
  update,
  softDelete,
  restore,
  hardDelete,
  bulk,
};
