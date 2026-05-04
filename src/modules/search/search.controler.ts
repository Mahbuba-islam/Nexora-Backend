/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import { Request, Response } from "express";
import AppError from "../../errorHelpers/AppError";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { prisma } from "../../lib/prisma";

/**
 * Postgres full-text search across the product catalog.
 *
 * Uses `to_tsvector` over name + shortDesc + description, plus
 * trigram-style ILIKE fallback for very short queries. No schema
 * change required (fully runtime). For production, the migration
 * could add a stored generated tsvector column + GIN index.
 */
const search = catchAsync(async (req: Request, res: Response) => {
  const q = String(req.query.q ?? "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  if (!q) {
    throw new AppError(status.BAD_REQUEST, "Query `q` is required");
  }

  // websearch_to_tsquery handles natural human input ("phone case red")
  // without throwing on punctuation or empty terms.
  const rows: { id: string; rank: number }[] = await prisma.$queryRawUnsafe(
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
  const products = ids.length
    ? await prisma.product.findMany({
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
              avgRating: true,
            },
          },
        },
      })
    : [];

  // Preserve rank order
  const orderMap = new Map(ids.map((id, idx) => [id, idx]));
  products.sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  );

  const totalRow: { count: bigint }[] = await prisma.$queryRawUnsafe(
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
    httpStatusCode: status.OK,
    success: true,
    message: "Search results",
    data: products,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      query: q,
    },
  });
});

/**
 * Lightweight typeahead — returns just product names + slugs.
 */
const suggest = catchAsync(async (req: Request, res: Response) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) {
    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Suggestions",
      data: [],
    });
    return;
  }
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
  const rows: { id: string; name: string; slug: string }[] =
    await prisma.$queryRawUnsafe(
      `SELECT p.id, p.name, p.slug FROM products p
       WHERE p."isDeleted" = false AND p.status = 'ACTIVE'::"ProductStatus"
         AND p.name ILIKE '%' || $1 || '%'
       ORDER BY p."soldCount" DESC
       LIMIT ${limit}`,
      q
    );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Suggestions",
    data: rows,
  });
});

export const searchController = { search, suggest };
