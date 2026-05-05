/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma";
import {
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
  ProductStatus,
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

/* ============================================================
 * Analytics page (Temu/Amazon-style admin analytics)
 * ============================================================ */

const ordersTimeseries = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const orders = await prisma.order.findMany({
    where: { placedAt: { gte: since } },
    select: { placedAt: true, status: true, paymentStatus: true, grandTotal: true },
  });

  const buckets: Record<string, { date: string; orders: number; paidOrders: number; revenue: number }> = {};
  for (const o of orders) {
    const day = o.placedAt.toISOString().slice(0, 10);
    if (!buckets[day]) buckets[day] = { date: day, orders: 0, paidOrders: 0, revenue: 0 };
    buckets[day].orders += 1;
    if (o.paymentStatus === PaymentStatus.PAID) {
      buckets[day].paidOrders += 1;
      buckets[day].revenue += toNumber(o.grandTotal);
    }
  }

  return Object.values(buckets)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => ({ ...b, revenue: Math.round(b.revenue * 100) / 100 }));
};

const salesByCategory = async (limit = 10) => {
  const rows = await prisma.$queryRawUnsafe<
    { category_id: string; category_name: string; units: bigint; revenue: string }[]
  >(`
    SELECT c.id AS category_id, c.name AS category_name,
           SUM(oi.quantity)::bigint AS units,
           SUM(oi."lineTotal")::numeric AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi."orderId"
    JOIN products p ON p.id = oi."productId"
    JOIN categories c ON c.id = p."categoryId"
    WHERE o."paymentStatus" = 'PAID'
    GROUP BY c.id, c.name
    ORDER BY revenue DESC
    LIMIT ${Math.min(50, Math.max(1, limit))}
  `);

  return rows.map((r) => ({
    categoryId: r.category_id,
    categoryName: r.category_name,
    units: Number(r.units),
    revenue: Math.round(Number(r.revenue) * 100) / 100,
  }));
};

const customerAcquisition = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const users = await prisma.user.findMany({
    where: { role: Role.CUSTOMER, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const buckets: Record<string, number> = {};
  for (const u of users) {
    const day = u.createdAt.toISOString().slice(0, 10);
    buckets[day] = (buckets[day] ?? 0) + 1;
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, newCustomers: count }));
};

const refundMetrics = async () => {
  const [byStatus, totalRefunded] = await Promise.all([
    prisma.refund.groupBy({
      by: ["status"],
      _count: true,
      _sum: { refundedAmount: true },
    }),
    prisma.refund.aggregate({
      where: { status: "COMPLETED" },
      _sum: { refundedAmount: true },
    }),
  ]);

  const paidRevenue = await prisma.order.aggregate({
    where: { paymentStatus: PaymentStatus.PAID },
    _sum: { grandTotal: true },
  });
  const gmv = toNumber(paidRevenue._sum.grandTotal);
  const refunded = toNumber(totalRefunded._sum.refundedAmount);

  return {
    byStatus: byStatus.map((r) => ({
      status: r.status,
      count: r._count,
      amount: Math.round(toNumber(r._sum.refundedAmount) * 100) / 100,
    })),
    totalRefunded: Math.round(refunded * 100) / 100,
    refundRate: gmv > 0 ? Math.round((refunded / gmv) * 10000) / 100 : 0,
  };
};

const topCustomers = async (limit = 10) => {
  const rows = await prisma.$queryRawUnsafe<
    { user_id: string; name: string; email: string; orders: bigint; spend: string }[]
  >(`
    SELECT u.id AS user_id, u.name, u.email,
           COUNT(o.id)::bigint AS orders,
           SUM(o."grandTotal")::numeric AS spend
    FROM "user" u
    JOIN orders o ON o."userId" = u.id
    WHERE o."paymentStatus" = 'PAID' AND u."isDeleted" = false
    GROUP BY u.id, u.name, u.email
    ORDER BY spend DESC
    LIMIT ${Math.min(50, Math.max(1, limit))}
  `);

  return rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    email: r.email,
    orderCount: Number(r.orders),
    lifetimeSpend: Math.round(Number(r.spend) * 100) / 100,
  }));
};

const conversionFunnel = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [carts, abandoned, converted, paid] = await Promise.all([
    prisma.cart.count({ where: { createdAt: { gte: since } } }),
    prisma.cart.count({
      where: { createdAt: { gte: since }, status: "ABANDONED" },
    }),
    prisma.cart.count({
      where: { createdAt: { gte: since }, status: "CONVERTED" },
    }),
    prisma.order.count({
      where: {
        placedAt: { gte: since },
        paymentStatus: PaymentStatus.PAID,
      },
    }),
  ]);

  return {
    carts,
    abandoned,
    converted,
    paidOrders: paid,
    conversionRate:
      carts > 0 ? Math.round((paid / carts) * 10000) / 100 : 0,
    abandonmentRate:
      carts > 0 ? Math.round((abandoned / carts) * 10000) / 100 : 0,
  };
};

const inventoryHealth = async () => {
  const [active, outOfStock, lowStockRows, archived, drafts] = await Promise.all([
    prisma.product.count({
      where: { isDeleted: false, status: ProductStatus.ACTIVE },
    }),
    prisma.product.count({
      where: { isDeleted: false, status: ProductStatus.OUT_OF_STOCK },
    }),
    prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM products WHERE "isDeleted" = false AND "trackInventory" = true AND stock <= "lowStockAlert" AND stock > 0`
    ),
    prisma.product.count({
      where: { isDeleted: false, status: ProductStatus.ARCHIVED },
    }),
    prisma.product.count({
      where: { isDeleted: false, status: ProductStatus.DRAFT },
    }),
  ]);
  const lowStock = Number(lowStockRows[0]?.count ?? 0);
  return { active, lowStock, outOfStock, archived, drafts };
};

export const statsService = {
  overview,
  recentOrders,
  topProducts,
  revenueByDay,
  marketplace,
  topSellers,
  payoutPipeline,
  // analytics
  ordersTimeseries,
  salesByCategory,
  customerAcquisition,
  refundMetrics,
  topCustomers,
  conversionFunnel,
  inventoryHealth,
};