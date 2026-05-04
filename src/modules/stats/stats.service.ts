/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma";
import {
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
  Role,
  SellerStatus,
} from "../../generated/enums";
import { toNumber } from "../../utilis/stringUtils";

const overview = async () => {
  const [totalProducts, totalOrders, totalCustomers, totalAdmins] =
    await Promise.all([
      prisma.product.count({ where: { isDeleted: false } }),
      prisma.order.count(),
      prisma.user.count({ where: { role: Role.CUSTOMER, isDeleted: false } }),
      prisma.user.count({ where: { role: Role.ADMIN, isDeleted: false } }),
    ]);

  const paidOrders = await prisma.order.findMany({
    where: { paymentStatus: PaymentStatus.PAID },
    select: { grandTotal: true },
  });
  const totalRevenue = paidOrders.reduce(
    (s, o) => s + toNumber(o.grandTotal),
    0
  );

  const [pendingOrders, paidOrdersCount, shippedOrders, deliveredOrders, cancelledOrders] =
    await Promise.all([
      prisma.order.count({ where: { status: OrderStatus.PENDING_PAYMENT } }),
      prisma.order.count({ where: { status: OrderStatus.PAID } }),
      prisma.order.count({ where: { status: OrderStatus.SHIPPED } }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
    ]);

  const lowStockProducts = await prisma.product.count({
    where: {
      isDeleted: false,
      trackInventory: true,
      stock: { lte: 5 },
    },
  });

  return {
    totals: {
      products: totalProducts,
      orders: totalOrders,
      customers: totalCustomers,
      admins: totalAdmins,
      revenue: Math.round(totalRevenue * 100) / 100,
      lowStockProducts,
    },
    orderBreakdown: {
      pending: pendingOrders,
      paid: paidOrdersCount,
      shipped: shippedOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
    },
  };
};

const recentOrders = async (limit = 10) => {
  const orders = await prisma.order.findMany({
    orderBy: { placedAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { select: { id: true, productName: true, quantity: true } },
    },
  });
  return orders;
};

const topProducts = async (limit = 10) => {
  return prisma.product.findMany({
    where: { isDeleted: false },
    orderBy: [{ soldCount: "desc" }, { avgRating: "desc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      soldCount: true,
      avgRating: true,
      reviewCount: true,
    },
  });
};

const revenueByDay = async (days = 14) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.PAID,
      paidAt: { gte: since },
    },
    select: { paidAt: true, grandTotal: true },
  });

  const buckets: Record<string, number> = {};
  for (const o of orders) {
    if (!o.paidAt) continue;
    const day = o.paidAt.toISOString().slice(0, 10);
    buckets[day] = (buckets[day] ?? 0) + toNumber(o.grandTotal);
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total: Math.round(total * 100) / 100 }));
};

/* ============================================================
 * Marketplace KPIs (multi-vendor specific)
 * ============================================================ */

const marketplace = async () => {
  const [
    totalSellers,
    pendingSellers,
    approvedSellers,
    suspendedSellers,
    rejectedSellers,
  ] = await Promise.all([
    prisma.seller.count({ where: { isDeleted: false } }),
    prisma.seller.count({ where: { status: SellerStatus.PENDING, isDeleted: false } }),
    prisma.seller.count({ where: { status: SellerStatus.APPROVED, isDeleted: false } }),
    prisma.seller.count({ where: { status: SellerStatus.SUSPENDED, isDeleted: false } }),
    prisma.seller.count({ where: { status: SellerStatus.REJECTED, isDeleted: false } }),
  ]);

  // GMV (gross merchandise volume) and platform commission, paid orders only
  const sellerOrders = await prisma.sellerOrder.findMany({
    where: {
      order: { paymentStatus: PaymentStatus.PAID },
    },
    select: { grandTotal: true, commissionAmount: true, payoutAmount: true },
  });
  const gmv = sellerOrders.reduce((s, o) => s + toNumber(o.grandTotal), 0);
  const totalCommission = sellerOrders.reduce(
    (s, o) => s + toNumber(o.commissionAmount),
    0
  );
  const sellerPayoutGross = sellerOrders.reduce(
    (s, o) => s + toNumber(o.payoutAmount),
    0
  );

  return {
    sellers: {
      total: totalSellers,
      pending: pendingSellers,
      approved: approvedSellers,
      suspended: suspendedSellers,
      rejected: rejectedSellers,
    },
    money: {
      gmv: Math.round(gmv * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      sellerPayoutGross: Math.round(sellerPayoutGross * 100) / 100,
    },
  };
};

const topSellers = async (limit = 10) => {
  return prisma.seller.findMany({
    where: { isDeleted: false, status: SellerStatus.APPROVED },
    orderBy: [{ totalSales: "desc" }, { orderCount: "desc" }],
    take: limit,
    select: {
      id: true,
      shopName: true,
      shopSlug: true,
      logo: true,
      totalSales: true,
      orderCount: true,
      avgRating: true,
      productCount: true,
    },
  });
};

const payoutPipeline = async () => {
  const [pending, processing, paid, failed] = await Promise.all([
    prisma.sellerPayout.aggregate({
      where: { status: PayoutStatus.PENDING },
      _sum: { netAmount: true },
      _count: true,
    }),
    prisma.sellerPayout.aggregate({
      where: { status: PayoutStatus.PROCESSING },
      _sum: { netAmount: true },
      _count: true,
    }),
    prisma.sellerPayout.aggregate({
      where: { status: PayoutStatus.PAID },
      _sum: { netAmount: true },
      _count: true,
    }),
    prisma.sellerPayout.aggregate({
      where: { status: PayoutStatus.FAILED },
      _sum: { netAmount: true },
      _count: true,
    }),
  ]);

  // Accrued but not yet bundled into a payout
  const accruedItems = await prisma.sellerPayoutItem.aggregate({
    where: { payoutId: null },
    _sum: { netAmount: true },
    _count: true,
  });

  const fmt = (a: { _sum: { netAmount: any }; _count: number }) => ({
    count: a._count,
    amount: Math.round(toNumber(a._sum.netAmount) * 100) / 100,
  });

  return {
    accrued: fmt(accruedItems),
    pending: fmt(pending),
    processing: fmt(processing),
    paid: fmt(paid),
    failed: fmt(failed),
  };
};

export const statsService = { overview, recentOrders, topProducts, revenueByDay, marketplace, topSellers, payoutPipeline };
