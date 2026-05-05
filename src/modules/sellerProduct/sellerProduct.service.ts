/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Seller "My Products" service.
 *
 * Powers the seller dashboard product management page. Every method
 * resolves the caller's seller.id from their userId and scopes all
 * reads/writes to that seller — sellers can never see or mutate
 * another shop's products.
 */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  PaymentStatus,
  ProductStatus,
  SellerStatus,
} from "../../generated/enums";
import { toNumber } from "../../utilis/stringUtils";

const resolveSellerId = async (userId: string) => {
  const seller = await prisma.seller.findUnique({
    where: { userId },
    select: { id: true, status: true, isDeleted: true },
  });
  if (!seller || seller.isDeleted) {
    throw new AppError(status.FORBIDDEN, "You don't have a seller profile");
  }
  if (seller.status !== SellerStatus.APPROVED) {
    throw new AppError(
      status.FORBIDDEN,
      `Your shop is not approved (status: ${seller.status})`
    );
  }
  return seller.id;
};

const ensureOwnership = async (productId: string, sellerId: string) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, sellerId: true, isDeleted: true, publishedAt: true },
  });
  if (!product) throw new AppError(status.NOT_FOUND, "Product not found");
  if (product.sellerId !== sellerId) {
    throw new AppError(status.FORBIDDEN, "This product belongs to another seller");
  }
  return product;
};

interface ListQuery {
  search?: string;
  status?: ProductStatus | "ALL";
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

const list = async (userId: string, q: ListQuery) => {
  const sellerId = await resolveSellerId(userId);

  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
  const skip = (page - 1) * limit;

  const where: any = { sellerId };

  if (q.isDeleted === "true") where.isDeleted = true;
  else if (q.isDeleted === "all") {
    /* no filter */
  } else where.isDeleted = false;

  if (q.status && q.status !== "ALL") where.status = q.status;
  if (q.categoryId) where.categoryId = q.categoryId;
  if (q.brandId) where.brandId = q.brandId;
  if (q.isFeatured === "true") where.isFeatured = true;
  if (q.isBestseller === "true") where.isBestseller = true;
  if (q.outOfStock === "true") where.stock = { lte: 0 };
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

  // Low-stock — column-vs-column comparison via raw SQL, then narrow.
  if (q.lowStock === "true") {
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM products WHERE "sellerId" = $1 AND "trackInventory" = true AND stock <= "lowStockAlert" AND "isDeleted" = false`,
      sellerId
    );
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) {
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }
    where.id = { in: ids };
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
        _count: { select: { variants: true, reviews: true, questions: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const summary = async (userId: string) => {
  const sellerId = await resolveSellerId(userId);

  const [active, drafts, archived, outOfStock, lowStockRows, deletedCount] =
    await Promise.all([
      prisma.product.count({
        where: { sellerId, isDeleted: false, status: ProductStatus.ACTIVE },
      }),
      prisma.product.count({
        where: { sellerId, isDeleted: false, status: ProductStatus.DRAFT },
      }),
      prisma.product.count({
        where: { sellerId, isDeleted: false, status: ProductStatus.ARCHIVED },
      }),
      prisma.product.count({
        where: { sellerId, isDeleted: false, stock: { lte: 0 } },
      }),
      prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint AS count FROM products WHERE "sellerId" = $1 AND "trackInventory" = true AND stock <= "lowStockAlert" AND stock > 0 AND "isDeleted" = false`,
        sellerId
      ),
      prisma.product.count({ where: { sellerId, isDeleted: true } }),
    ]);

  return {
    active,
    drafts,
    archived,
    outOfStock,
    lowStock: Number(lowStockRows[0]?.count ?? 0),
    deleted: deletedCount,
  };
};

const getDetail = async (userId: string, productId: string) => {
  const sellerId = await resolveSellerId(userId);
  await ensureOwnership(productId, sellerId);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      specifications: { orderBy: { sortOrder: "asc" } },
      tags: true,
      brand: true,
      category: true,
      _count: {
        select: { orderItems: true, reviews: true, questions: true },
      },
    },
  });
  if (!product) throw new AppError(status.NOT_FOUND, "Product not found");

  const items = await prisma.orderItem.findMany({
    where: {
      productId,
      order: { paymentStatus: PaymentStatus.PAID },
    },
    select: { quantity: true, lineTotal: true },
  });
  const unitsSold = items.reduce((s, i) => s + i.quantity, 0);
  const revenue = items.reduce((s, i) => s + toNumber(i.lineTotal), 0);

  const refundCount = await prisma.refundItem.count({
    where: { orderItem: { productId } },
  });

  return {
    ...product,
    stats: {
      unitsSold,
      revenue: Math.round(revenue * 100) / 100,
      refundCount,
      refundRate:
        unitsSold > 0 ? Math.round((refundCount / unitsSold) * 10000) / 100 : 0,
    },
  };
};

const update = async (
  userId: string,
  productId: string,
  payload: Record<string, any>
) => {
  const sellerId = await resolveSellerId(userId);
  const existing = await ensureOwnership(productId, sellerId);

  // Whitelist fields the seller may edit on their own product.
  // Sellers cannot self-feature/bestseller — that's an admin merchandising
  // decision. Slug/SKU are also intentionally locked once set.
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
    "widthMm",
    "heightMm",
    "depthMm",
    "status",
    "condition",
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

  // Sellers may publish/unpublish — but never ARCHIVE themselves out of the
  // catalog without using the soft-delete endpoint (keeps audit clean).
  if (data.status && !["DRAFT", "ACTIVE", "OUT_OF_STOCK"].includes(data.status)) {
    throw new AppError(
      status.BAD_REQUEST,
      "Invalid status. Use DELETE to archive a product."
    );
  }

  if (data.status === ProductStatus.ACTIVE && !existing.publishedAt) {
    data.publishedAt = new Date();
  }

  return prisma.product.update({ where: { id: productId }, data });
};

const softDelete = async (userId: string, productId: string) => {
  const sellerId = await resolveSellerId(userId);
  const existing = await ensureOwnership(productId, sellerId);
  if (existing.isDeleted) {
    throw new AppError(status.CONFLICT, "Product is already deleted");
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: ProductStatus.ARCHIVED,
      },
    });
    await tx.seller
      .update({
        where: { id: sellerId },
        data: { productCount: { decrement: 1 } },
      })
      .catch(() => null);
  });

  return { id: productId, deleted: true };
};

const restore = async (userId: string, productId: string) => {
  const sellerId = await resolveSellerId(userId);
  const existing = await ensureOwnership(productId, sellerId);
  if (!existing.isDeleted) {
    throw new AppError(status.CONFLICT, "Product is not deleted");
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        isDeleted: false,
        deletedAt: null,
        status: ProductStatus.DRAFT,
      },
    });
    await tx.seller
      .update({
        where: { id: sellerId },
        data: { productCount: { increment: 1 } },
      })
      .catch(() => null);
  });

  return { id: productId, restored: true };
};

interface BulkPayload {
  ids: string[];
  action: "activate" | "draft" | "archive" | "delete" | "restore";
}

const bulk = async (userId: string, payload: BulkPayload) => {
  const sellerId = await resolveSellerId(userId);
  if (!payload.ids?.length) {
    throw new AppError(status.BAD_REQUEST, "ids[] is required");
  }

  // Hard-fence: only operate on products this seller actually owns.
  const owned = await prisma.product.findMany({
    where: { id: { in: payload.ids }, sellerId },
    select: { id: true },
  });
  const ownedIds = owned.map((p) => p.id);
  if (ownedIds.length === 0) {
    throw new AppError(status.NOT_FOUND, "No matching products in your shop");
  }

  const where = { id: { in: ownedIds } };

  switch (payload.action) {
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
    case "archive":
      return prisma.product.updateMany({
        where,
        data: { status: ProductStatus.ARCHIVED },
      });
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
        data: {
          isDeleted: false,
          deletedAt: null,
          status: ProductStatus.DRAFT,
        },
      });
    default:
      throw new AppError(status.BAD_REQUEST, "Unknown bulk action");
  }
};

export const sellerProductService = {
  list,
  summary,
  getDetail,
  update,
  softDelete,
  restore,
  bulk,
};
