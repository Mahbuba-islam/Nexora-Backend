/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { prisma } from "../../lib/prisma";

const productInclude = {
  images: { take: 1, orderBy: { sortOrder: "asc" as const } },
  seller: { select: { id: true, shopName: true, shopSlug: true } },
};

/**
 * Frequently-bought-together: products that appear in the same orders
 * as the seed product, ranked by co-occurrence count then sold count.
 */
const fbt = catchAsync(async (req: Request, res: Response) => {
  const productId = req.params.productId as string;
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 6));

  const rows: { product_id: string; cooccurrence: bigint }[] =
    await prisma.$queryRawUnsafe(
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
  const products = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids }, isDeleted: false, status: "ACTIVE" },
        include: productInclude,
      })
    : [];

  // If we have fewer than `limit`, top up with same-category bestsellers.
  if (products.length < limit) {
    const seed = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });
    if (seed) {
      const fillIds = products.map((p) => p.id);
      const extra = await prisma.product.findMany({
        where: {
          id: { notIn: [productId, ...fillIds] },
          categoryId: seed.categoryId,
          isDeleted: false,
          status: "ACTIVE",
        },
        orderBy: [{ soldCount: "desc" }, { createdAt: "desc" }],
        take: limit - products.length,
        include: productInclude,
      });
      products.push(...extra);
    }
  }

  // Preserve co-occurrence rank for the FBT-derived ones
  const orderMap = new Map(ids.map((id, idx) => [id, idx]));
  products.sort((a, b) => {
    const ai = orderMap.get(a.id) ?? 999;
    const bi = orderMap.get(b.id) ?? 999;
    return ai - bi;
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Frequently bought together",
    data: products,
    meta: {
      seedProductId: productId,
      fromCoOccurrence: ids.length,
      total: products.length,
    },
  });
});

/**
 * Customers also viewed: same category, sorted by viewCount.
 */
const alsoViewed = catchAsync(async (req: Request, res: Response) => {
  const productId = req.params.productId as string;
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 6));

  const seed = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true },
  });
  if (!seed) {
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Customers also viewed",
      data: [],
    });
    return;
  }

  const data = await prisma.product.findMany({
    where: {
      id: { not: productId },
      categoryId: seed.categoryId,
      isDeleted: false,
      status: "ACTIVE",
    },
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: productInclude,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Customers also viewed",
    data,
  });
});

/**
 * Personalized "for you" feed: based on the user's purchase + view
 * history, surface bestsellers from their preferred categories.
 * Falls back to global bestsellers for new users.
 */
const forYou = catchAsync(async (req: Request, res: Response) => {
  const limit = Math.min(40, Math.max(1, Number(req.query.limit) || 12));
  const userId = req.user?.userId;

  let categoryIds: string[] = [];
  if (userId) {
    const recent = await prisma.orderItem.findMany({
      where: { order: { userId } },
      select: { product: { select: { categoryId: true } } },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    categoryIds = Array.from(
      new Set(recent.map((r) => r.product.categoryId))
    );
  }

  const data = await prisma.product.findMany({
    where: {
      isDeleted: false,
      status: "ACTIVE",
      ...(categoryIds.length ? { categoryId: { in: categoryIds } } : {}),
    },
    orderBy: [
      { soldCount: "desc" },
      { avgRating: "desc" },
      { viewCount: "desc" },
    ],
    take: limit,
    include: productInclude,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "For you",
    data,
    meta: { personalized: categoryIds.length > 0, categoryCount: categoryIds.length },
  });
});

export const recommendationController = { fbt, alsoViewed, forYou };
