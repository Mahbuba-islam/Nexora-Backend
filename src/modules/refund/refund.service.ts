/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import Stripe from "stripe";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { envVars } from "../../config/env";
import {
  NotificationType,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  Role,
  SellerOrderStatus,
} from "../../generated/enums";
import { round2, toNumber } from "../../utilis/stringUtils";
import { notificationService } from "../notification/notification.service";
import type { IRequestRefund, IDecideRefund } from "./refund.validation";

const stripeKey = envVars.STRIPE.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

const generateRefundNumber = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `RF-${year}-${rand}`;
};

/**
 * Customer creates a refund request for items they purchased.
 */
const requestRefund = async (userId: string, payload: IRequestRefund) => {
  const order = await prisma.order.findFirst({
    where: { id: payload.orderId, userId },
    include: { items: true, sellerOrders: true },
  });
  if (!order) throw new AppError(status.NOT_FOUND, "Order not found");
  if (order.paymentStatus !== PaymentStatus.PAID) {
    throw new AppError(
      status.BAD_REQUEST,
      "Only paid orders are eligible for refund"
    );
  }

  // Validate items belong to the order (and to the seller-order if supplied)
  const itemMap = new Map(order.items.map((i) => [i.id, i]));
  let amount = 0;
  let sellerId: string | null = null;
  for (const it of payload.items) {
    const oi = itemMap.get(it.orderItemId);
    if (!oi) {
      throw new AppError(
        status.BAD_REQUEST,
        `Order item ${it.orderItemId} is not part of this order`
      );
    }
    if (it.quantity > oi.quantity) {
      throw new AppError(
        status.BAD_REQUEST,
        `Quantity exceeds ordered amount for ${oi.productName}`
      );
    }
    if (payload.sellerOrderId && oi.sellerOrderId !== payload.sellerOrderId) {
      throw new AppError(
        status.BAD_REQUEST,
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
            const oi = itemMap.get(it.orderItemId)!;
            return {
              orderItemId: oi.id,
              quantity: it.quantity,
              amount: round2(toNumber(oi.unitPrice) * it.quantity),
            };
          }),
        },
      },
      include: { items: true },
    });

    if (payload.sellerOrderId) {
      await tx.sellerOrder.update({
        where: { id: payload.sellerOrderId },
        data: { status: SellerOrderStatus.RETURN_REQUESTED },
      });
    } else {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.RETURN_REQUESTED },
      });
    }
    return created;
  });

  // Notify seller (if scoped) + admins
  if (sellerId) {
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { userId: true, shopName: true },
    });
    if (seller) {
      await notificationService
        .createNotification({
          userId: seller.userId,
          type: NotificationType.REFUND_REQUESTED,
          title: "Refund requested",
          message: `A customer has requested a refund of ${order.currency} ${amount.toFixed(2)} on order ${order.orderNumber}.`,
          actionUrl: `/seller/refunds/${refund.id}`,
          metadata: { refundId: refund.id, orderId: order.id },
        })
        .catch(() => null);
    }
  }
  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN, isDeleted: false },
    select: { id: true },
  });
  if (admins.length) {
    await notificationService
      .createNotificationsForUsers(
        admins.map((a) => a.id),
        {
          type: NotificationType.REFUND_REQUESTED,
          title: "Refund requested",
          message: `Refund #${refund.refundNumber} for order ${order.orderNumber} (${order.currency} ${amount.toFixed(2)}).`,
          actionUrl: `/admin/refunds/${refund.id}`,
          metadata: { refundId: refund.id },
        }
      )
      .catch(() => null);
  }

  return refund;
};

/**
 * Seller / admin approves a pending refund (does NOT yet move money).
 */
const approveRefund = async (
  refundId: string,
  actor: { userId: string; role: Role },
  payload: IDecideRefund
) => {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { order: true },
  });
  if (!refund) throw new AppError(status.NOT_FOUND, "Refund not found");
  if (refund.status !== RefundStatus.REQUESTED) {
    throw new AppError(
      status.BAD_REQUEST,
      `Refund is already ${refund.status}`
    );
  }

  if (actor.role === Role.SELLER) {
    if (!refund.sellerId) {
      throw new AppError(status.FORBIDDEN, "Order-wide refund requires admin");
    }
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });
    if (!seller || seller.id !== refund.sellerId) {
      throw new AppError(status.FORBIDDEN, "Not your refund to approve");
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
      decidedAt: new Date(),
      decisionNote: payload.decisionNote,
    },
  });

  await notificationService
    .createNotification({
      userId: refund.requestedById,
      type: NotificationType.REFUND_APPROVED,
      title: "Refund approved",
      message: `Your refund #${refund.refundNumber} was approved for ${refund.currency} ${approvedAmount.toFixed(2)}. Processing payment...`,
      actionUrl: `/account/refunds/${refund.id}`,
      metadata: { refundId },
    })
    .catch(() => null);

  // Auto-process via Stripe in the background
  void processRefund(refundId).catch(() => null);
  return updated;
};

const rejectRefund = async (
  refundId: string,
  actor: { userId: string; role: Role },
  payload: IDecideRefund
) => {
  const refund = await prisma.refund.findUnique({ where: { id: refundId } });
  if (!refund) throw new AppError(status.NOT_FOUND, "Refund not found");
  if (refund.status !== RefundStatus.REQUESTED) {
    throw new AppError(status.BAD_REQUEST, `Refund is already ${refund.status}`);
  }

  if (actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });
    if (!seller || seller.id !== refund.sellerId) {
      throw new AppError(status.FORBIDDEN, "Not your refund to reject");
    }
  }

  const updated = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: RefundStatus.REJECTED,
      decidedById: actor.userId,
      decidedAt: new Date(),
      decisionNote: payload.decisionNote,
    },
  });

  await notificationService
    .createNotification({
      userId: refund.requestedById,
      type: NotificationType.REFUND_REJECTED,
      title: "Refund rejected",
      message: `Your refund #${refund.refundNumber} was not approved.${payload.decisionNote ? ` Reason: ${payload.decisionNote}` : ""}`,
      actionUrl: `/account/refunds/${refund.id}`,
      metadata: { refundId },
    })
    .catch(() => null);

  return updated;
};

/**
 * Push the refund to Stripe (or mark COMPLETED if order had no Stripe payment).
 * Idempotent — safe to retry.
 */
const processRefund = async (refundId: string) => {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: {
      order: { include: { payments: true } },
    },
  });
  if (!refund) throw new AppError(status.NOT_FOUND, "Refund not found");
  if (
    refund.status !== RefundStatus.APPROVED &&
    refund.status !== RefundStatus.PROCESSING
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot process a refund in status ${refund.status}`
    );
  }

  const approvedAmount = round2(
    toNumber(refund.approvedAmount ?? refund.requestedAmount)
  );

  // Mark PROCESSING first so retries are safe
  await prisma.refund.update({
    where: { id: refundId },
    data: { status: RefundStatus.PROCESSING },
  });

  const stripePayment = refund.order.payments.find(
    (p) => p.stripePaymentIntentId && p.status === PaymentStatus.PAID
  );

  let stripeRefundId: string | null = null;
  let stripeChargeId: string | null = null;

  try {
    if (stripe && stripePayment?.stripePaymentIntentId) {
      const r = await stripe.refunds.create({
        payment_intent: stripePayment.stripePaymentIntentId,
        amount: Math.round(approvedAmount * 100),
        reason: "requested_by_customer",
        metadata: {
          refundId: refund.id,
          orderId: refund.orderId,
          orderNumber: refund.order.orderNumber,
        },
      });
      stripeRefundId = r.id;
      stripeChargeId = (r.charge as string) || null;
    }
  } catch (err: any) {
    await prisma.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.FAILED, decisionNote: err?.message },
    });
    throw new AppError(
      status.BAD_GATEWAY,
      `Stripe refund failed: ${err?.message ?? "unknown error"}`
    );
  }

  // Persist completion + cascade payment / order / seller-order status
  const completed = await prisma.$transaction(async (tx) => {
    const updated = await tx.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.COMPLETED,
        refundedAmount: approvedAmount,
        stripeRefundId,
        stripeChargeId,
        completedAt: new Date(),
      },
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
          status: fullyRefunded
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PARTIALLY_REFUNDED,
          refundedAt: new Date(),
        },
      });
    }

    // Update order paymentStatus aggregate
    const order = await tx.order.findUnique({
      where: { id: refund.orderId },
      select: { grandTotal: true },
    });
    if (order) {
      const totalRefunded = await tx.refund.aggregate({
        where: {
          orderId: refund.orderId,
          status: RefundStatus.COMPLETED,
        },
        _sum: { refundedAmount: true },
      });
      const refundedSum = toNumber(totalRefunded._sum.refundedAmount ?? 0);
      const fully = refundedSum >= toNumber(order.grandTotal);
      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          paymentStatus: fully
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PARTIALLY_REFUNDED,
          status: fully ? OrderStatus.REFUNDED : OrderStatus.RETURNED,
        },
      });
    }

    if (refund.sellerOrderId) {
      await tx.sellerOrder.update({
        where: { id: refund.sellerOrderId },
        data: { status: SellerOrderStatus.REFUNDED },
      });
      // Bump payout-item refundAmount so future payout net is reduced
      await tx.sellerPayoutItem.updateMany({
        where: { sellerOrderId: refund.sellerOrderId },
        data: { refundAmount: { increment: approvedAmount } },
      });
    }

    return updated;
  });

  await notificationService
    .createNotification({
      userId: refund.requestedById,
      type: NotificationType.REFUND_COMPLETED,
      title: "Refund completed",
      message: `${refund.currency} ${approvedAmount.toFixed(2)} has been refunded for order ${refund.order.orderNumber}.`,
      actionUrl: `/account/refunds/${refund.id}`,
      metadata: { refundId },
    })
    .catch(() => null);

  return completed;
};

const listMine = async (userId: string, query: any) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
  const where: any = { requestedById: userId };
  if (query.status) where.status = query.status;
  const [data, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { items: true, order: { select: { orderNumber: true } } },
    }),
    prisma.refund.count({ where }),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const listForSeller = async (userId: string, query: any) => {
  const seller = await prisma.seller.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!seller) throw new AppError(status.FORBIDDEN, "Not a seller");

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
  const where: any = { sellerId: seller.id };
  if (query.status) where.status = query.status;

  const [data, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        items: true,
        order: { select: { orderNumber: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.refund.count({ where }),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const listAll = async (query: any) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const where: any = {};
  if (query.status) where.status = query.status;
  if (query.sellerId) where.sellerId = query.sellerId;
  const [data, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        items: true,
        order: { select: { orderNumber: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.refund.count({ where }),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const getById = async (id: string, actor: { userId: string; role: Role }) => {
  const refund = await prisma.refund.findUnique({
    where: { id },
    include: {
      items: { include: { orderItem: true } },
      order: true,
      sellerOrder: true,
      requestedBy: { select: { id: true, name: true, email: true } },
      decidedBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!refund) throw new AppError(status.NOT_FOUND, "Refund not found");

  if (actor.role === Role.CUSTOMER && refund.requestedById !== actor.userId) {
    throw new AppError(status.FORBIDDEN, "Not your refund");
  }
  if (actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });
    if (!seller || seller.id !== refund.sellerId) {
      throw new AppError(status.FORBIDDEN, "Not your refund");
    }
  }

  return refund;
};

export const refundService = {
  requestRefund,
  approveRefund,
  rejectRefund,
  processRefund,
  listMine,
  listForSeller,
  listAll,
  getById,
};
