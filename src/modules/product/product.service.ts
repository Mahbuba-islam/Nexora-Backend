/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ProductCondition, ProductStatus, Role, SellerStatus } from "../../generated/enums";
import { slugify } from "../../utilis/stringUtils";

export interface ICreateProduct {
  name: string;
  sku: string;
  shortDesc?: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  costPerItem?: number;
  currency?: string;
  stock?: number;
  lowStockAlert?: number;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  weightGrams?: number;
  widthMm?: number;
  heightMm?: number;
  depthMm?: number;
  status?: ProductStatus;
  condition?: ProductCondition;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isOnSale?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  brandId?: string | null;
  categoryId: string;
  // Marketplace: required, but resolved by controller from req.user / body.
  sellerId?: string;
  images?: { url: string; alt?: string; isPrimary?: boolean; sortOrder?: number }[];
  specifications?: { group?: string; label: string; value: string; sortOrder?: number }[];
  tagIds?: string[];
}

const ensureUniqueSlug = async (base: string, ignoreId?: string) => {
  let slug = base || "product";
  let i = 1;
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${++i}`;
  }
};

const createProduct = async (payload: ICreateProduct) => {
  if (!payload.sellerId) {
    throw new AppError(status.BAD_REQUEST, "sellerId is required");
  }

  // Verify seller exists and is approved (admins may bypass via direct DB)
  const seller = await prisma.seller.findUnique({
    where: { id: payload.sellerId },
    select: { id: true, status: true, isDeleted: true },
  });
  if (!seller || seller.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Seller not found");
  }
  if (seller.status !== SellerStatus.APPROVED) {
    throw new AppError(
      status.FORBIDDEN,
      `Seller is not approved (status: ${seller.status})`
    );
  }

  const slug = await ensureUniqueSlug(slugify(payload.name));

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
      publishedAt:
        payload.status === ProductStatus.ACTIVE ? new Date() : null,
      images: payload.images?.length
        ? { create: payload.images.map((img, idx) => ({
            url: img.url,
            alt: img.alt,
            isPrimary: img.isPrimary ?? idx === 0,
            sortOrder: img.sortOrder ?? idx,
          })) }
        : undefined,
      specifications: payload.specifications?.length
        ? { create: payload.specifications }
        : undefined,
      tags: payload.tagIds?.length
        ? { connect: payload.tagIds.map((id) => ({ id })) }
        : undefined,
    },
    include: {
      images: true,
      specifications: true,
      tags: true,
      brand: true,
      category: true,
      variants: true,
    },
  });

  // Maintain seller.productCount aggregate.
  await prisma.seller.update({
    where: { id: payload.sellerId },
    data: { productCount: { increment: 1 } },
  }).catch(() => null);

  return product;
};

/**
 * Resolve which sellerId to use when the caller is creating/listing/updating.
 * - SELLER role: must use their own seller.id (sellerId in body is ignored)
 * - ADMIN/STAFF: may pass any sellerId (e.g. acting on behalf, or for seed)
 */
const resolveActorSellerId = async (
  user: { userId: string; role: Role },
  bodySellerId?: string
): Promise<string> => {
  if (user.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: user.userId },
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
  }
  if (!bodySellerId) {
    throw new AppError(
      status.BAD_REQUEST,
      "sellerId is required when creating on behalf of a seller"
    );
  }
  return bodySellerId;
};

interface ListProductsQuery {
  search?: string;
  categoryId?: string;
  brandId?: string;
  sellerId?: string;
  sellerSlug?: string;
  minPrice?: string;
  maxPrice?: string;
  status?: ProductStatus;
  condition?: ProductCondition;
  isFeatured?: string;
  isBestseller?: string;
  isNewArrival?: string;
  isOnSale?: string;
  sortBy?: "price" | "createdAt" | "soldCount" | "avgRating" | "viewCount";
  sortOrder?: "asc" | "desc";
  page?: string;
  limit?: string;
  tagId?: string;
}

const listProducts = async (q: ListProductsQuery) => {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(q.limit) || 20));
  const skip = (page - 1) * limit;

  const where: any = {
    isDeleted: false,
    status: q.status ?? ProductStatus.ACTIVE,
  };
  if (q.search)
    where.OR = [
      { name: { contains: q.search, mode: "insensitive" } },
      { shortDesc: { contains: q.search, mode: "insensitive" } },
      { description: { contains: q.search, mode: "insensitive" } },
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
          select: { id: true, shopName: true, shopSlug: true, logo: true, avgRating: true },
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

const getProductBySlug = async (slug: string) => {
  const product = await prisma.product.findFirst({
    where: { slug, isDeleted: false },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true } },
      specifications: { orderBy: { sortOrder: "asc" } },
      tags: true,
      brand: true,
      category: true,
    },
  });
  if (!product) throw new AppError(status.NOT_FOUND, "Product not found");

  // fire-and-forget view counter
  prisma.product
    .update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => null);

  return product;
};

const getProductById = async (id: string) => {
  const product = await prisma.product.findFirst({
    where: { id, isDeleted: false },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      specifications: { orderBy: { sortOrder: "asc" } },
      tags: true,
      brand: true,
      category: true,
    },
  });
  if (!product) throw new AppError(status.NOT_FOUND, "Product not found");
  return product;
};

const updateProduct = async (
  id: string,
  payload: Partial<ICreateProduct>,
  actor?: { userId: string; role: Role }
) => {
  const existing = await prisma.product.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existing) throw new AppError(status.NOT_FOUND, "Product not found");

  // Ownership guard: sellers can only update their own products.
  if (actor && actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });
    if (!seller || seller.id !== existing.sellerId) {
      throw new AppError(status.FORBIDDEN, "You can only edit your own products");
    }
  }

  const data: any = {};
  if (payload.name !== undefined) {
    data.name = payload.name;
    data.slug = await ensureUniqueSlug(slugify(payload.name), id);
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
    "categoryId",
  ] as const) {
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

const deleteProduct = async (
  id: string,
  actor?: { userId: string; role: Role }
) => {
  const existing = await prisma.product.findFirst({
    where: { id, isDeleted: false },
    select: { id: true, sellerId: true },
  });
  if (!existing) throw new AppError(status.NOT_FOUND, "Product not found");

  if (actor && actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });
    if (!seller || seller.id !== existing.sellerId) {
      throw new AppError(status.FORBIDDEN, "You can only delete your own products");
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      status: ProductStatus.ARCHIVED,
    },
  });

  await prisma.seller.update({
    where: { id: existing.sellerId },
    data: { productCount: { decrement: 1 } },
  }).catch(() => null);

  return updated;
};

export const productService = {
  createProduct,
  listProducts,
  getProductBySlug,
  getProductById,
  updateProduct,
  deleteProduct,
  resolveActorSellerId,
};
