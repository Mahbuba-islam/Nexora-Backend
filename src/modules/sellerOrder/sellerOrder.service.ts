/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  FulfillmentStatus,
  NotificationType,
  OrderStatus,
  Role,
  SellerOrderStatus,
} from "../../generated/enums";
import { QueryBuilder } from "../../utilis/queryBuilder";
import { toNumber } from "../../utilis/stringUtils";
import { notificationService } from "../notification/notification.service";

/* ============================================================
 * State machine
 * ============================================================
 *
 * Allowed forward transitions for a SellerOrder.
 * CANCELLED, REFUNDED, RETURNED are terminal.
 */
const ALLOWED_NEXT: Record<SellerOrderStatus, SellerOrderStatus[]> = {
  [SellerOrderStatus.PENDING]: [
    SellerOrderStatus.CONFIRMED,
    SellerOrderStatus.CANCELLED,
  ],
  [SellerOrderStatus.CONFIRMED]: [
    SellerOrderStatus.PROCESSING,
    SellerOrderStatus.CANCELLED,
  ],
  [SellerOrderStatus.PROCESSING]: [
    SellerOrderStatus.PACKED,
    SellerOrderStatus.CANCELLED,
  ],
  [SellerOrderStatus.PACKED]: [
    SellerOrderStatus.SHIPPED,
    SellerOrderStatus.CANCELLED,
  ],
  [SellerOrderStatus.SHIPPED]: [
    SellerOrderStatus.OUT_FOR_DELIVERY,
    SellerOrderStatus.DELIVERED,
  ],
  [SellerOrderStatus.OUT_FOR_DELIVERY]: [SellerOrderStatus.DELIVERED],
  [SellerOrderStatus.DELIVERED]: [
    SellerOrderStatus.RETURN_REQUESTED,
    SellerOrderStatus.REFUNDED,
  ],
  [SellerOrderStatus.RETURN_REQUESTED]: [
    SellerOrderStatus.RETURNED,
    SellerOrderStatus.DELIVERED,
  ],
  [SellerOrderStatus.RETURNED]: [SellerOrderStatus.REFUNDED],
  [SellerOrderStatus.CANCELLED]: [],
  [SellerOrderStatus.REFUNDED]: [],
};

const assertTransitionAllowed = (
  from: SellerOrderStatus,
  to: SellerOrderStatus
) => {
  if (from === to) return;
  const allowed = ALLOWED_NEXT[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(
      status.BAD_REQUEST,
      `Invalid status transition: ${from} -> ${to}`
    );
  }
};

/**
 * Resolve the seller row that the calling user owns.
 */
const resolveActorSellerId = async (userId: string): Promise<string> => {
  const seller = await prisma.seller.findUnique({
    where: { userId },
    select: { id: true, isDeleted: true },
  });
  if (!seller || seller.isDeleted) {
    throw new AppError(status.FORBIDDEN, "You are not a seller");
  }
  return seller.id;
};

/**
 * After a SellerOrder transitions, recompute the parent Order's
 * fulfillmentStatus / status. Called inside the same transaction.
 */
const reconcileParentOrder = async (
  tx: any,
  orderId: string
): Promise<void> => {
  const subs = await tx.sellerOrder.findMany({
    where: { orderId },
    select: { status: true },
  });
  if (subs.length === 0) return;

  const allDelivered = subs.every(
    (s: any) => s.status === SellerOrderStatus.DELIVERED
  );
  const allCancelled = subs.every(
    (s: any) => s.status === SellerOrderStatus.CANCELLED
  );
  const anyDelivered = subs.some(
    (s: any) => s.status === SellerOrderStatus.DELIVERED
  );
  const anyShipped = subs.some(
    (s: any) =>
      s.status === SellerOrderStatus.SHIPPED ||
      s.status === SellerOrderStatus.OUT_FOR_DELIVERY ||
      s.status === SellerOrderStatus.DELIVERED
  );

  const data: any = {};
  if (allDelivered) {
    data.status = OrderStatus.DELIVERED;
    data.fulfillmentStatus = FulfillmentStatus.FULFILLED;
    data.deliveredAt = new Date();
  } else if (allCancelled) {
    data.status = OrderStatus.CANCELLED;
    data.cancelledAt = new Date();
  } else if (anyShipped) {
    data.status = OrderStatus.SHIPPED;
    data.fulfillmentStatus = anyDelivered
      ? FulfillmentStatus.PARTIAL
      : FulfillmentStatus.UNFULFILLED;
  } else {
    data.fulfillmentStatus = FulfillmentStatus.UNFULFILLED;
  }

  if (Object.keys(data).length > 0) {
    await tx.order.update({ where: { id: orderId }, data });
  }
};

/* ============================================================ */

const listMine = async (
  userId: string,
  query: Record<string, any>
) => {
  const sellerId = await resolveActorSellerId(userId);
  const qb = new QueryBuilder(prisma.sellerOrder as any, query, {
    searchableFields: ["sellerOrderNumber", "trackingNumber"],
    filterableFields: ["status", "fulfillmentStatus"],
  });

  qb.search().filter().sort().paginate();
  const built = (qb as any).getQuery();
  built.where = { ...(built.where ?? {}), sellerId };
  built.orderBy = { createdAt: "desc" };
  built.include = {
    order: {
      select: {
        id: true,
        orderNumber: true,
        user: { select: { id: true, name: true, email: true } },
      },
    },
    items: true,
  };

  const [data, total] = await Promise.all([
    prisma.sellerOrder.findMany(built),
    prisma.sellerOrder.count({ where: built.where }),
  ]);
  const limit = Number(query.limit) || 10;
  return {
    data,
    meta: {
      page: Number(query.page) || 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const listAll = async (query: Record<string, any>) => {
  const qb = new QueryBuilder(prisma.sellerOrder as any, query, {
    searchableFields: ["sellerOrderNumber", "trackingNumber"],
    filterableFields: ["status", "fulfillmentStatus", "sellerId", "orderId"],
  });

  qb.search().filter().sort().paginate();
  const built = (qb as any).getQuery();
  built.orderBy = { createdAt: "desc" };
  built.include = {
    order: {
      select: {
        id: true,
        orderNumber: true,
        user: { select: { id: true, name: true, email: true } },
      },
    },
    seller: { select: { id: true, shopName: true, shopSlug: true } },
    items: true,
  };

  const [data, total] = await Promise.all([
    prisma.sellerOrder.findMany(built),
    prisma.sellerOrder.count({ where: built.where }),
  ]);
  const limit = Number(query.limit) || 10;
  return {
    data,
    meta: {
      page: Number(query.page) || 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getById = async (
  id: string,
  actor: { userId: string; role: Role }
) => {
  const so = await prisma.sellerOrder.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          shippingAddress: true,
          billingAddress: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      seller: true,
      items: true,
      history: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!so) throw new AppError(status.NOT_FOUND, "Sub-order not found");

  // Sellers can only see their own
  if (actor.role === Role.SELLER) {
    const sellerId = await resolveActorSellerId(actor.userId);
    if (so.sellerId !== sellerId) {
      throw new AppError(status.FORBIDDEN, "Not your sub-order");
    }
  }
  return so;
};

const ensureActorOwns = async (
  so: { sellerId: string },
  actor: { userId: string; role: Role }
) => {
  if (actor.role === Role.ADMIN || actor.role === Role.STAFF) return;
  if (actor.role === Role.SELLER) {
    const sellerId = await resolveActorSellerId(actor.userId);
    if (so.sellerId !== sellerId) {
      throw new AppError(status.FORBIDDEN, "Not your sub-order");
    }
    return;
  }
  throw new AppError(status.FORBIDDEN, "Insufficient role");
};

/**
 * Update SellerOrder status. Sellers may only push their own.
 */
const updateStatus = async (
  id: string,
  toStatus: SellerOrderStatus,
  actor: { userId: string; role: Role },
  note?: string
) => {
  const so = await prisma.sellerOrder.findUnique({
    where: { id },
    include: {
      order: { select: { id: true, orderNumber: true, userId: true } },
      seller: { select: { shopName: true, userId: true } },
    },
  });
  if (!so) throw new AppError(status.NOT_FOUND, "Sub-order not found");
  await ensureActorOwns(so, actor);
  assertTransitionAllowed(so.status, toStatus);

  const data: any = { status: toStatus };
  if (toStatus === SellerOrderStatus.SHIPPED) data.shippedAt = new Date();
  if (toStatus === SellerOrderStatus.DELIVERED) {
    data.deliveredAt = new Date();
    data.fulfillmentStatus = FulfillmentStatus.FULFILLED;
  }
  if (toStatus === SellerOrderStatus.CANCELLED) {
    data.cancelledAt = new Date();
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
        note,
      },
    });

    // If sub-order is cancelled, restock its items
    if (toStatus === SellerOrderStatus.CANCELLED) {
      const items = await tx.orderItem.findMany({
        where: { sellerOrderId: id },
      });
      for (const it of items) {
        if (it.variantId) {
          await tx.productVariant.update({
            where: { id: it.variantId },
            data: { stock: { increment: it.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { increment: it.quantity } },
          });
        }
      }
    }

    // If delivered, accrue payout item + bump seller aggregates
    if (toStatus === SellerOrderStatus.DELIVERED) {
      const existingItem = await tx.sellerPayoutItem.findUnique({
        where: { sellerOrderId: id },
      });
      if (!existingItem) {
        await tx.sellerPayoutItem.create({
          data: {
            sellerOrderId: id,
            grossAmount: u.subtotal,
            commissionAmount: u.commissionAmount,
            refundAmount: 0,
            netAmount: u.payoutAmount,
          },
        });
      }
      await tx.seller.update({
        where: { id: so.sellerId },
        data: {
          orderCount: { increment: 1 },
          totalSales: { increment: toNumber(u.payoutAmount) },
        },
      });
    }

    await reconcileParentOrder(tx, so.order.id);
    return u;
  });

  // Notifications: customer is informed of every transition
  const customerType: Partial<Record<SellerOrderStatus, NotificationType>> = {
    [SellerOrderStatus.SHIPPED]: NotificationType.ORDER_SHIPPED,
    [SellerOrderStatus.DELIVERED]: NotificationType.ORDER_DELIVERED,
    [SellerOrderStatus.CANCELLED]: NotificationType.SELLER_ORDER_CANCELLED,
  };
  const notifType = customerType[toStatus] ?? NotificationType.SYSTEM;
  await notificationService
    .createNotification({
      userId: so.order.userId,
      type: notifType,
      title: `${so.seller.shopName} — ${toStatus.replace(/_/g, " ").toLowerCase()}`,
      message: `Sub-order ${so.sellerOrderNumber} is now ${toStatus}.`,
      actionUrl: `/orders/${so.order.id}`,
      metadata: {
        orderId: so.order.id,
        sellerOrderId: id,
        status: toStatus,
      },
    })
    .catch(() => null);

  return updated;
};

const addTracking = async (
  id: string,
  payload: { courier: string; trackingNumber: string; trackingUrl?: string },
  actor: { userId: string; role: Role }
) => {
  const so = await prisma.sellerOrder.findUnique({ where: { id } });
  if (!so) throw new AppError(status.NOT_FOUND, "Sub-order not found");
  await ensureActorOwns(so, actor);

  return prisma.sellerOrder.update({
    where: { id },
    data: {
      courier: payload.courier,
      trackingNumber: payload.trackingNumber,
      trackingUrl: payload.trackingUrl,
    },
  });
};

const cancel = async (
  id: string,
  reason: string,
  actor: { userId: string; role: Role }
) =>
  updateStatus(id, SellerOrderStatus.CANCELLED, actor, reason);

export const sellerOrderService = {
  listMine,
  listAll,
  getById,
  updateStatus,
  addTracking,
  cancel,
  reconcileParentOrder,
};
