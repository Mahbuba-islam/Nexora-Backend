/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  NotificationType,
  PayoutMethod,
  PayoutStatus,
  Role,
} from "../../generated/enums";
import { QueryBuilder } from "../../utilis/queryBuilder";
import { round2, toNumber } from "../../utilis/stringUtils";
import { notificationService } from "../notification/notification.service";

/**
 * Generate a Payout for a seller, scooping up all unpaid
 * SellerPayoutItems (auto-accrued when SellerOrders went DELIVERED)
 * within the date range. Returns null if there is nothing to pay.
 */
const generatePayout = async (payload: {
  sellerId: string;
  periodStart?: Date;
  periodEnd?: Date;
  method?: PayoutMethod;
}) => {
  const seller = await prisma.seller.findUnique({
    where: { id: payload.sellerId },
  });
  if (!seller) throw new AppError(status.NOT_FOUND, "Seller not found");

  const periodStart = payload.periodStart ?? new Date(0);
  const periodEnd = payload.periodEnd ?? new Date();

  const items = await prisma.sellerPayoutItem.findMany({
    where: {
      payoutId: null,
      sellerOrder: {
        sellerId: payload.sellerId,
        deliveredAt: { gte: periodStart, lte: periodEnd },
      },
    },
    include: { sellerOrder: { select: { currency: true } } },
  });

  if (items.length === 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "No unpaid delivered orders for this period"
    );
  }

  const grossAmount = round2(
    items.reduce((s, i) => s + toNumber(i.grossAmount), 0)
  );
  const commissionAmount = round2(
    items.reduce((s, i) => s + toNumber(i.commissionAmount), 0)
  );
  const refundAmount = round2(
    items.reduce((s, i) => s + toNumber(i.refundAmount), 0)
  );
  const netAmount = round2(
    items.reduce((s, i) => s + toNumber(i.netAmount), 0)
  );

  const method =
    payload.method ??
    (seller.payoutMethod as PayoutMethod | null) ??
    PayoutMethod.MANUAL_BANK;
  const currency = items[0]?.sellerOrder?.currency ?? "USD";

  const payout = await prisma.$transaction(async (tx) => {
    const created = await tx.sellerPayout.create({
      data: {
        sellerId: payload.sellerId,
        periodStart,
        periodEnd,
        currency,
        grossAmount,
        commissionAmount,
        refundAmount,
        adjustmentAmount: 0,
        netAmount,
        method,
        status: PayoutStatus.PENDING,
      },
    });
    await tx.sellerPayoutItem.updateMany({
      where: { id: { in: items.map((i) => i.id) } },
      data: { payoutId: created.id },
    });
    return created;
  });

  await notificationService
    .createNotification({
      userId: seller.userId,
      type: NotificationType.PAYOUT_INITIATED,
      title: "Payout initiated",
      message: `Payout of ${currency} ${netAmount.toFixed(2)} initiated for ${
        items.length
      } orders.`,
      actionUrl: "/seller/payouts",
      metadata: { payoutId: payout.id },
    })
    .catch(() => null);

  return payout;
};

const markPaid = async (
  id: string,
  payload: { bankReference?: string; stripeTransferId?: string }
) => {
  const payout = await prisma.sellerPayout.findUnique({
    where: { id },
    include: { seller: { select: { userId: true } } },
  });
  if (!payout) throw new AppError(status.NOT_FOUND, "Payout not found");
  if (payout.status === PayoutStatus.PAID) {
    throw new AppError(status.BAD_REQUEST, "Payout already paid");
  }

  const updated = await prisma.sellerPayout.update({
    where: { id },
    data: {
      status: PayoutStatus.PAID,
      paidAt: new Date(),
      bankReference: payload.bankReference,
      stripeTransferId: payload.stripeTransferId,
    },
  });

  await notificationService
    .createNotification({
      userId: payout.seller.userId,
      type: NotificationType.PAYOUT_PAID,
      title: "Payout paid",
      message: `Your payout of ${payout.currency} ${toNumber(
        payout.netAmount
      ).toFixed(2)} has been disbursed.`,
      actionUrl: "/seller/payouts",
      metadata: { payoutId: id },
    })
    .catch(() => null);

  return updated;
};

const markFailed = async (id: string, failureReason: string) => {
  const payout = await prisma.sellerPayout.findUnique({
    where: { id },
    include: { seller: { select: { userId: true } } },
  });
  if (!payout) throw new AppError(status.NOT_FOUND, "Payout not found");

  const updated = await prisma.sellerPayout.update({
    where: { id },
    data: { status: PayoutStatus.FAILED, failureReason },
  });

  await notificationService
    .createNotification({
      userId: payout.seller.userId,
      type: NotificationType.PAYOUT_FAILED,
      title: "Payout failed",
      message: `Your payout failed: ${failureReason}`,
      actionUrl: "/seller/payouts",
      metadata: { payoutId: id },
    })
    .catch(() => null);

  return updated;
};

const listMine = async (userId: string, query: Record<string, any>) => {
  const seller = await prisma.seller.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!seller) throw new AppError(status.FORBIDDEN, "Not a seller");

  const qb = new QueryBuilder(prisma.sellerPayout as any, query, {
    searchableFields: ["bankReference", "stripeTransferId"],
    filterableFields: ["status", "method"],
  });
  qb.search().filter().sort().paginate();
  const built = (qb as any).getQuery();
  built.where = { ...(built.where ?? {}), sellerId: seller.id };
  built.orderBy = { createdAt: "desc" };
  built.include = { items: true };

  const [data, total] = await Promise.all([
    prisma.sellerPayout.findMany(built),
    prisma.sellerPayout.count({ where: built.where }),
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
  const qb = new QueryBuilder(prisma.sellerPayout as any, query, {
    searchableFields: ["bankReference", "stripeTransferId"],
    filterableFields: ["status", "method", "sellerId"],
  });
  qb.search().filter().sort().paginate();
  const built = (qb as any).getQuery();
  built.orderBy = { createdAt: "desc" };
  built.include = {
    seller: { select: { id: true, shopName: true, shopSlug: true } },
    items: true,
  };

  const [data, total] = await Promise.all([
    prisma.sellerPayout.findMany(built),
    prisma.sellerPayout.count({ where: built.where }),
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

const getById = async (id: string, actor: { userId: string; role: Role }) => {
  const payout = await prisma.sellerPayout.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, shopName: true, userId: true } },
      items: { include: { sellerOrder: true } },
    },
  });
  if (!payout) throw new AppError(status.NOT_FOUND, "Payout not found");
  if (
    actor.role === Role.SELLER &&
    payout.seller.userId !== actor.userId
  ) {
    throw new AppError(status.FORBIDDEN, "Not your payout");
  }
  return payout;
};

export const payoutService = {
  generatePayout,
  markPaid,
  markFailed,
  listMine,
  listAll,
  getById,
};
