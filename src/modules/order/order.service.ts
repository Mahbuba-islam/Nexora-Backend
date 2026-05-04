/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  CartStatus,
  FulfillmentStatus,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  SellerOrderStatus,
  SellerStatus,
} from "../../generated/enums";
import { round2, toNumber } from "../../utilis/stringUtils";
import {
  allocateDiscount,
  calculateCommission,
  calculateSellerShipping,
  calculateTax,
  ShippingMethod,
} from "../../utilis/marketplacePricing";
import { couponService } from "../coupon/coupon.service";
import { notificationService } from "../notification/notification.service";

export interface ICheckoutPayload {
  shippingAddressId: string;
  billingAddressId?: string;
  couponCode?: string;
  customerNote?: string;
  shippingMethod?: ShippingMethod;
}

const generateOrderNumber = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `NX-${year}-${rand}`;
};

const generateSellerOrderNumber = (parent: string, idx: number) =>
  `${parent}-S${idx + 1}`;

/* ============================================================
 * CHECKOUT (multi-vendor)
 * ============================================================
 *
 * 1. Resolve cart, addresses, coupon discount.
 * 2. Group cart items by seller.
 * 3. Per group: subtotal, shipping, allocated discount, tax,
 *    commission, payout amount.
 * 4. Persist Order + N SellerOrder rows + OrderItem rows that
 *    reference both, in a single transaction. Decrement stock.
 * 5. Notify customer (one) and each seller (one per shop).
 */
const checkout = async (userId: string, payload: ICheckoutPayload) => {
  const cart = await prisma.cart.findFirst({
    where: { userId, status: CartStatus.ACTIVE },
    include: {
      items: {
        include: {
          product: { include: { seller: true } },
          variant: true,
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) {
    throw new AppError(status.BAD_REQUEST, "Cart is empty");
  }

  const shippingAddress = await prisma.address.findFirst({
    where: { id: payload.shippingAddressId, userId, isDeleted: false },
  });
  if (!shippingAddress) {
    throw new AppError(status.NOT_FOUND, "Shipping address not found");
  }

  let billingAddress = shippingAddress;
  if (
    payload.billingAddressId &&
    payload.billingAddressId !== payload.shippingAddressId
  ) {
    const found = await prisma.address.findFirst({
      where: { id: payload.billingAddressId, userId, isDeleted: false },
    });
    if (!found) throw new AppError(status.NOT_FOUND, "Billing address not found");
    billingAddress = found;
  }

  // ---- Resolve line items + verify stock + verify seller ----
  type ResolvedItem = {
    productId: string;
    variantId: string | null;
    sellerId: string;
    sellerCommissionRate: number | null;
    productName: string;
    variantName: string | null;
    sku: string;
    image: string | null;
    unitPrice: number;
    quantity: number;
    lineSubtotal: number;
  };

  const resolvedItems: ResolvedItem[] = [];

  for (const item of cart.items) {
    if (!item.product.seller) {
      throw new AppError(
        status.BAD_REQUEST,
        `Product ${item.product.name} has no seller assigned`
      );
    }
    if (
      item.product.seller.status !== SellerStatus.APPROVED ||
      item.product.seller.isDeleted
    ) {
      throw new AppError(
        status.BAD_REQUEST,
        `${item.product.name} is no longer available (seller unavailable)`
      );
    }

    const stockSource = item.variant ?? item.product;
    if (
      item.product.trackInventory &&
      !item.product.allowBackorder &&
      (stockSource.stock ?? 0) < item.quantity
    ) {
      throw new AppError(
        status.BAD_REQUEST,
        `Insufficient stock for ${item.product.name}`
      );
    }

    const unitPrice = toNumber(item.variant?.price ?? item.product.price);
    const lineSubtotal = round2(unitPrice * item.quantity);

    let image: string | null = item.variant?.image ?? null;
    if (!image) {
      const primary = await prisma.productImage.findFirst({
        where: { productId: item.productId, isPrimary: true },
      });
      image = primary?.url ?? null;
    }

    resolvedItems.push({
      productId: item.productId,
      variantId: item.variantId ?? null,
      sellerId: item.product.sellerId,
      sellerCommissionRate: item.product.seller.commissionRate
        ? toNumber(item.product.seller.commissionRate)
        : null,
      productName: item.product.name,
      variantName: item.variant?.name ?? null,
      sku: item.variant?.sku ?? item.product.sku,
      image,
      unitPrice,
      quantity: item.quantity,
      lineSubtotal,
    });
  }

  // ---- Group by seller ----
  const sellerGroups = new Map<string, ResolvedItem[]>();
  for (const it of resolvedItems) {
    const arr = sellerGroups.get(it.sellerId) ?? [];
    arr.push(it);
    sellerGroups.set(it.sellerId, arr);
  }
  const sellerIds = Array.from(sellerGroups.keys());

  const subtotal = round2(
    resolvedItems.reduce((s, i) => s + i.lineSubtotal, 0)
  );

  // ---- Coupon (applied at order level) ----
  let totalDiscount = 0;
  const couponCode = payload.couponCode ?? cart.couponCode ?? null;
  if (couponCode) {
    const preview = await couponService.validateCoupon(couponCode, subtotal);
    totalDiscount = preview.discountAmount;
  }

  // ---- Per-seller pricing rollup ----
  const shippingMethod: ShippingMethod = payload.shippingMethod ?? "standard";
  const groupSubtotals = sellerIds.map((sid) =>
    round2(
      sellerGroups.get(sid)!.reduce((s, it) => s + it.lineSubtotal, 0)
    )
  );
  const discountAllocations = allocateDiscount(groupSubtotals, totalDiscount);

  type SellerRollup = {
    sellerId: string;
    items: ResolvedItem[];
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    grandTotal: number;
    commissionRate: number;
    commissionAmount: number;
    payoutAmount: number;
  };

  const sellerRollups: SellerRollup[] = sellerIds.map((sid, idx) => {
    const items = sellerGroups.get(sid)!;
    const sellerSubtotal = groupSubtotals[idx];
    const discount = discountAllocations[idx];
    const shipping = calculateSellerShipping(sellerSubtotal, shippingMethod);
    const taxable = Math.max(0, sellerSubtotal - discount);
    const tax = calculateTax(taxable);
    const grandTotal = round2(taxable + shipping + tax);

    const commission = calculateCommission(
      taxable,
      items[0].sellerCommissionRate
    );

    return {
      sellerId: sid,
      items,
      subtotal: sellerSubtotal,
      discount,
      shipping,
      tax,
      grandTotal,
      ...commission,
    };
  });

  const shippingTotal = round2(
    sellerRollups.reduce((s, r) => s + r.shipping, 0)
  );
  const taxTotal = round2(sellerRollups.reduce((s, r) => s + r.tax, 0));
  const grandTotal = round2(
    sellerRollups.reduce((s, r) => s + r.grandTotal, 0)
  );

  const orderNumber = generateOrderNumber();
  const currency = cart.items[0]?.product.currency ?? "USD";

  // ---- Persist ----
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: OrderStatus.PENDING_PAYMENT,
        fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
        paymentStatus: PaymentStatus.UNPAID,
        currency,
        subtotal,
        shippingTotal,
        taxTotal,
        discountTotal: totalDiscount,
        grandTotal,
        couponCode,
        couponDiscount: totalDiscount || null,
        shippingAddressId: shippingAddress.id,
        shippingSnapshot: shippingAddress as never,
        billingAddressId: billingAddress.id,
        billingSnapshot: billingAddress as never,
        customerNote: payload.customerNote,
      },
    });

    for (let i = 0; i < sellerRollups.length; i++) {
      const r = sellerRollups[i];
      const sellerOrder = await tx.sellerOrder.create({
        data: {
          sellerOrderNumber: generateSellerOrderNumber(orderNumber, i),
          orderId: created.id,
          sellerId: r.sellerId,
          status: SellerOrderStatus.PENDING,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          currency,
          subtotal: r.subtotal,
          shippingTotal: r.shipping,
          taxTotal: r.tax,
          discountTotal: r.discount,
          grandTotal: r.grandTotal,
          commissionRate: r.commissionRate,
          commissionAmount: r.commissionAmount,
          payoutAmount: r.payoutAmount,
          customerNote: payload.customerNote,
        },
      });

      await tx.sellerOrderStatusHistory.create({
        data: {
          sellerOrderId: sellerOrder.id,
          toStatus: SellerOrderStatus.PENDING,
          note: "Sub-order created",
        },
      });

      for (const it of r.items) {
        const itemShare = r.subtotal > 0 ? it.lineSubtotal / r.subtotal : 0;
        const lineDiscount = round2(r.discount * itemShare);
        const lineTotal = round2(it.lineSubtotal - lineDiscount);

        await tx.orderItem.create({
          data: {
            orderId: created.id,
            sellerOrderId: sellerOrder.id,
            sellerId: r.sellerId,
            productId: it.productId,
            variantId: it.variantId,
            productName: it.productName,
            variantName: it.variantName,
            sku: it.sku,
            image: it.image,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            lineSubtotal: it.lineSubtotal,
            lineDiscount,
            lineTotal,
          },
        });
      }
    }

    for (const item of resolvedItems) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    await tx.cart.update({
      where: { id: cart.id },
      data: { status: CartStatus.CONVERTED, orderId: created.id },
    });

    await tx.orderStatusHistory.create({
      data: { orderId: created.id, toStatus: OrderStatus.PENDING_PAYMENT },
    });

    return created;
  });

  if (couponCode) {
    await couponService.incrementUsage(couponCode);
  }

  // ---- Notifications ----
  await notificationService
    .createNotification({
      userId,
      type: NotificationType.ORDER_PLACED,
      title: "Order placed",
      message: `Your order ${order.orderNumber} has been placed across ${sellerRollups.length} shop(s).`,
      actionUrl: `/orders/${order.id}`,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    })
    .catch(() => null);

  for (const r of sellerRollups) {
    const sellerRow = await prisma.seller.findUnique({
      where: { id: r.sellerId },
      select: { userId: true, shopName: true },
    });
    if (!sellerRow) continue;
    await notificationService
      .createNotification({
        userId: sellerRow.userId,
        type: NotificationType.NEW_SELLER_ORDER,
        title: "New order received",
        message: `${sellerRow.shopName}: a new order worth ${currency} ${r.grandTotal.toFixed(
          2
        )} is awaiting payment confirmation.`,
        actionUrl: `/seller/orders`,
        metadata: { orderId: order.id, sellerId: r.sellerId },
      })
      .catch(() => null);
  }

  // Low-stock fan-out: any product whose remaining stock dropped to or
  // below its lowStockAlert threshold gets a notification to its seller.
  await checkLowStockAndNotify(
    Array.from(new Set(resolvedItems.map((i) => i.productId))),
    Array.from(
      new Set(
        resolvedItems
          .map((i) => i.variantId)
          .filter((v): v is string => v !== null)
      )
    )
  ).catch(() => null);

  return order;
};

/**
 * After stock decrement, fire LOW_STOCK notifications for products /
 * variants that have dipped to or below their lowStockAlert.
 */
const checkLowStockAndNotify = async (
  productIds: string[],
  variantIds: string[]
) => {
  if (productIds.length === 0) return;

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, trackInventory: true, isDeleted: false },
    select: {
      id: true,
      name: true,
      stock: true,
      lowStockAlert: true,
      seller: { select: { userId: true, shopName: true } },
    },
  });

  for (const p of products) {
    if (!p.seller) continue;
    if (p.stock <= p.lowStockAlert) {
      await notificationService
        .createNotification({
          userId: p.seller.userId,
          type: NotificationType.LOW_STOCK,
          title: "Low stock alert",
          message: `${p.name} is running low (${p.stock} left).`,
          actionUrl: `/seller/products/${p.id}`,
          metadata: { productId: p.id, stock: p.stock },
        })
        .catch(() => null);
    }
  }

  if (variantIds.length === 0) return;
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      name: true,
      stock: true,
      product: {
        select: {
          id: true,
          name: true,
          lowStockAlert: true,
          seller: { select: { userId: true, shopName: true } },
        },
      },
    },
  });
  for (const v of variants) {
    if (!v.product?.seller) continue;
    if (v.stock <= v.product.lowStockAlert) {
      await notificationService
        .createNotification({
          userId: v.product.seller.userId,
          type: NotificationType.LOW_STOCK,
          title: "Low stock alert",
          message: `${v.product.name} (${v.name}) is running low (${v.stock} left).`,
          actionUrl: `/seller/products/${v.product.id}`,
          metadata: { productId: v.product.id, variantId: v.id, stock: v.stock },
        })
        .catch(() => null);
    }
  }
};

/* ============================================================ */

const listForUser = async (
  userId: string,
  query: { page?: string; limit?: string; status?: OrderStatus }
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;
  const where: any = { userId };
  if (query.status) where.status = query.status;

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip,
      take: limit,
      include: {
        items: true,
        sellerOrders: {
          include: {
            seller: { select: { shopName: true, shopSlug: true, logo: true } },
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const listAll = async (query: {
  page?: string;
  limit?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query.status) where.status = query.status;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
  if (query.search) where.orderNumber = { contains: query.search.toUpperCase() };

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip,
      take: limit,
      include: {
        items: true,
        user: { select: { id: true, email: true, name: true } },
        sellerOrders: {
          include: {
            seller: { select: { shopName: true, shopSlug: true } },
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getById = async (id: string, userId?: string) => {
  const where: any = { id };
  if (userId) where.userId = userId;

  const order = await prisma.order.findFirst({
    where,
    include: {
      items: true,
      payments: true,
      history: { orderBy: { createdAt: "asc" } },
      shippingAddress: true,
      billingAddress: true,
      sellerOrders: {
        include: {
          seller: {
            select: { id: true, shopName: true, shopSlug: true, logo: true },
          },
          items: true,
          history: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!order) throw new AppError(status.NOT_FOUND, "Order not found");
  return order;
};

const updateStatus = async (
  orderId: string,
  toStatus: OrderStatus,
  changedBy?: string,
  note?: string
) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(status.NOT_FOUND, "Order not found");

  const data: any = { status: toStatus };
  if (toStatus === OrderStatus.SHIPPED) data.shippedAt = new Date();
  if (toStatus === OrderStatus.DELIVERED) {
    data.deliveredAt = new Date();
    data.fulfillmentStatus = FulfillmentStatus.FULFILLED;
  }
  if (toStatus === OrderStatus.CANCELLED) data.cancelledAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.order.update({ where: { id: orderId }, data });
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus,
        changedBy: changedBy ?? null,
        note,
      },
    });
    return u;
  });

  const statusToType: Partial<Record<OrderStatus, NotificationType>> = {
    [OrderStatus.PAID]: NotificationType.ORDER_PAID,
    [OrderStatus.SHIPPED]: NotificationType.ORDER_SHIPPED,
    [OrderStatus.DELIVERED]: NotificationType.ORDER_DELIVERED,
    [OrderStatus.CANCELLED]: NotificationType.ORDER_CANCELLED,
  };
  const notifType = statusToType[toStatus] ?? NotificationType.SYSTEM;
  await notificationService
    .createNotification({
      userId: updated.userId,
      type: notifType,
      title: `Order ${updated.orderNumber} ${toStatus.replace(/_/g, " ").toLowerCase()}`,
      message: `Your order status is now: ${toStatus}`,
      actionUrl: `/orders/${updated.id}`,
      metadata: { orderId: updated.id, status: toStatus },
    })
    .catch(() => null);

  return updated;
};

const cancel = async (orderId: string, userId: string, reason?: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { sellerOrders: true },
  });
  if (!order) throw new AppError(status.NOT_FOUND, "Order not found");

  const anyShipped = order.sellerOrders.some(
    (so) =>
      so.status === SellerOrderStatus.SHIPPED ||
      so.status === SellerOrderStatus.OUT_FOR_DELIVERY ||
      so.status === SellerOrderStatus.DELIVERED
  );
  if (anyShipped) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot cancel — at least one shop has already shipped"
    );
  }

  await prisma.$transaction(async (tx) => {
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    for (const so of order.sellerOrders) {
      await tx.sellerOrder.update({
        where: { id: so.id },
        data: {
          status: SellerOrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason ?? "Cancelled by customer",
        },
      });
      await tx.sellerOrderStatusHistory.create({
        data: {
          sellerOrderId: so.id,
          fromStatus: so.status,
          toStatus: SellerOrderStatus.CANCELLED,
          changedBy: userId,
          note: reason ?? "Customer cancellation",
        },
      });
    }
  });

  if (order.couponCode) {
    await couponService.decrementUsage(order.couponCode);
  }

  return updateStatus(orderId, OrderStatus.CANCELLED, userId, reason);
};

export const orderService = {
  checkout,
  listForUser,
  listAll,
  getById,
  updateStatus,
  cancel,
};
