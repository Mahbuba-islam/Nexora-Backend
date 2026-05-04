/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  NotificationType,
  ProductStatus,
  Role,
} from "../../generated/enums";
import { notificationService } from "../notification/notification.service";

const resolveSellerScope = async (actor: { userId: string; role: Role }) => {
  if (actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });
    if (!seller) throw new AppError(status.FORBIDDEN, "Not a seller");
    return seller.id;
  }
  return null; // admin/staff sees all
};

/** List products at or below their low-stock threshold. */
const listLowStock = async (
  actor: { userId: string; role: Role },
  query: any
) => {
  const sellerId = await resolveSellerScope(actor);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

  // We can't compare two columns in a Prisma `where` directly, so we use raw SQL
  // for the filter then hydrate with Prisma.
  const filter = sellerId ? `AND p."sellerId" = $1::uuid` : "";
  const params: any[] = sellerId ? [sellerId] : [];
  const rows: { id: string }[] = await prisma.$queryRawUnsafe(
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

  const data = ids.length
    ? await prisma.product.findMany({
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
            select: { id: true, shopName: true, shopSlug: true },
          },
        },
      })
    : [];

  // Preserve sort order
  const orderMap = new Map(ids.map((id, idx) => [id, idx]));
  data.sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  );

  const totalRow: { count: bigint }[] = await prisma.$queryRawUnsafe(
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
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const restockProduct = async (
  productId: string,
  actor: { userId: string; role: Role },
  payload: { stock: number; variantId?: string }
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, sellerId: true, stock: true, status: true },
  });
  if (!product) throw new AppError(status.NOT_FOUND, "Product not found");

  if (actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });
    if (!seller || seller.id !== product.sellerId) {
      throw new AppError(status.FORBIDDEN, "Not your product");
    }
  }

  if (payload.variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: payload.variantId },
    });
    if (!variant || variant.productId !== productId) {
      throw new AppError(status.NOT_FOUND, "Variant not found");
    }
    return prisma.productVariant.update({
      where: { id: payload.variantId },
      data: { stock: { increment: payload.stock } },
    });
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      stock: { increment: payload.stock },
      // Auto-flip ARCHIVED→ACTIVE? Only flip OUT_OF_STOCK→ACTIVE.
      status:
        product.status === ProductStatus.OUT_OF_STOCK
          ? ProductStatus.ACTIVE
          : product.status,
    },
  });

  // Notify the seller user that their stock was replenished.
  const seller = await prisma.seller.findFirst({
    where: { id: product.sellerId },
    select: { userId: true },
  });
  if (seller) {
    await notificationService
      .createNotification({
        userId: seller.userId,
        type: NotificationType.SYSTEM,
        title: "Stock updated",
        message: `${updated.name} stock is now ${updated.stock}.`,
        actionUrl: `/seller/products/${updated.id}`,
        metadata: { productId: updated.id, stock: updated.stock },
      })
      .catch(() => null);
  }

  return updated;
};

const summary = async (actor: { userId: string; role: Role }) => {
  const sellerId = await resolveSellerScope(actor);
  const where: any = { isDeleted: false, trackInventory: true };
  if (sellerId) where.sellerId = sellerId;

  const [totalProducts, allProducts] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: { stock: true, lowStockAlert: true, status: true },
    }),
  ]);

  const lowStock = allProducts.filter((p) => p.stock <= p.lowStockAlert).length;
  const outOfStock = allProducts.filter((p) => p.stock === 0).length;
  const totalUnits = allProducts.reduce((s, p) => s + p.stock, 0);

  return { totalProducts, lowStock, outOfStock, totalUnits };
};

export const inventoryService = {
  listLowStock,
  restockProduct,
  summary,
};
