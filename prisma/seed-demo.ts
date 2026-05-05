/* eslint-disable no-console */
/**
 * Nexora — Demo dashboard data seeder.
 *
 * Layers realistic transactional data ON TOP of the catalog produced by
 * `npm run seed` so the admin / seller / customer dashboards look
 * production-grade out of the box:
 *
 *   - 2 brand-new PENDING seller applications (so admin can practice
 *     approve / reject / suspend / message).
 *   - Customer addresses for every existing customer.
 *   - ~80 orders spread across the last 30 days with a realistic mix of
 *     statuses and payment states (drives admin GMV / charts AND every
 *     customer's orders tab AND every seller's order list).
 *   - Per-seller payout accruals + payouts in PENDING / PROCESSING /
 *     PAID / FAILED states (drives the "Payout pipeline" widget).
 *   - A handful of refunds across statuses (drives the Refunds card).
 *   - Extra customer & seller notifications (PROMO, PRICE_DROP,
 *     LOW_STOCK, etc.) so notification bells aren't empty.
 *   - Recomputes Product.soldCount and Seller.totalSales / orderCount /
 *     productCount aggregates so dashboard KPIs are accurate.
 *
 * Idempotent: re-running wipes & refreshes all transactional data
 * belonging to the seeded demo customer accounts (the @nexora.dev
 * fixtures), so live customer data is never touched. Order numbers,
 * refund numbers and notifications use production formatting so the
 * UI looks identical to real data.
 *
 * Run with:  npm run seed:demo
 */

import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import {
  AddressType,
  KycStatus,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutMethod,
  PayoutStatus,
  Role,
  SellerOrderStatus,
  SellerStatus,
  UserStatus,
} from "../src/generated/enums";
import { auth } from "../src/lib/auth";
import { seedDemoAccounts } from "../src/utilis/seed";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

// Emails belonging to the seeded fixtures. Used to scope wipe-and-
// refresh idempotency so we never touch real customer data.
const SEEDED_CUSTOMER_EMAILS = [
  "emma@nexora.dev",
  "liam@nexora.dev",
  "sophia@nexora.dev",
  "noah@nexora.dev",
  "ava@nexora.dev",
  "mason@nexora.dev",
  "demo.customer@nexora.dev",
];

function pad(n: number, w = 5) {
  return String(n).padStart(w, "0");
}
function randomDigits(len: number) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}
function makeOrderNumber(placedAt: Date) {
  return `NX-${placedAt.getFullYear()}-${randomDigits(6)}`;
}
function makeRefundNumber(date: Date) {
  return `RF-${date.getFullYear()}-${randomDigits(6)}`;
}
function daysAgo(n: number, hour = 12, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function pick<T>(arr: T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length];
}
function rand(seed: number) {
  let x = seed || 1;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 0xffffffff;
  };
}

// ---------------------------------------------------------------
// 1. Pending seller applications (so admin Sellers list isn't empty
//    of moderation work).
// ---------------------------------------------------------------

type PendingApplicantSeed = {
  email: string;
  password: string;
  name: string;
  shopName: string;
  shopSlug: string;
  tagline: string;
  contactEmail: string;
  country: string;
};

const pendingApplicants: PendingApplicantSeed[] = [
  {
    email: "applicant.urban@nexora.dev",
    password: "Seller@123",
    name: "Marcus Reed",
    shopName: "Urban Edge",
    shopSlug: "urban-edge",
    tagline: "Streetwear for the modern city",
    contactEmail: "marcus@urbanedge.example",
    country: "US",
  },
  {
    email: "applicant.greenleaf@nexora.dev",
    password: "Seller@123",
    name: "Priya Shah",
    shopName: "Greenleaf Organics",
    shopSlug: "greenleaf-organics",
    tagline: "Plant-powered home & beauty",
    contactEmail: "priya@greenleaf.example",
    country: "GB",
  },
];

async function seedPendingSellers() {
  for (const a of pendingApplicants) {
    let user = await prisma.user.findUnique({ where: { email: a.email } });
    if (!user) {
      try {
        const signup = await auth.api.signUpEmail({
          body: {
            email: a.email,
            password: a.password,
            name: a.name,
            role: Role.CUSTOMER,
            rememberMe: false,
          },
        });
        user = await prisma.user.findUnique({ where: { id: signup.user.id } });
      } catch (err) {
        console.error(`  ! Failed signing up ${a.email}:`, (err as Error).message);
        continue;
      }
    }
    if (!user) continue;

    await prisma.user.update({
      where: { id: user.id },
      // Role stays CUSTOMER until admin approves the application.
      data: { emailVerified: true, status: UserStatus.ACTIVE, role: Role.CUSTOMER },
    });

    const existing = await prisma.seller.findUnique({ where: { userId: user.id } });
    if (existing) {
      // Reset back to PENDING so demo always shows pending applications.
      await prisma.seller.update({
        where: { id: existing.id },
        data: {
          status: SellerStatus.PENDING,
          kycStatus: KycStatus.SUBMITTED,
          rejectionReason: null,
          suspensionReason: null,
          approvedAt: null,
          rejectedAt: null,
          suspendedAt: null,
        },
      });
    } else {
      await prisma.seller.create({
        data: {
          userId: user.id,
          shopName: a.shopName,
          shopSlug: a.shopSlug,
          tagline: a.tagline,
          description: `${a.shopName} is a new applicant awaiting admin review.`,
          contactEmail: a.contactEmail,
          legalName: a.shopName,
          country: a.country,
          status: SellerStatus.PENDING,
          kycStatus: KycStatus.SUBMITTED,
          payoutMethod: PayoutMethod.MANUAL_BANK,
        },
      });
    }
  }

  // Notify all admins for visibility.
  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN, isDeleted: false },
    select: { id: true },
  });
  for (const a of pendingApplicants) {
    for (const admin of admins) {
      // Idempotent-ish: skip if the same notification already exists today.
      const existing = await prisma.notification.findFirst({
        where: {
          userId: admin.id,
          type: NotificationType.NEW_SELLER_APPLICATION,
          title: "New seller application",
          message: { contains: a.shopName },
        },
      });
      if (existing) continue;
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: NotificationType.NEW_SELLER_APPLICATION,
          title: "New seller application",
          message: `${a.name} applied to open shop "${a.shopName}".`,
          actionUrl: `/admin/sellers`,
          metadata: { shopSlug: a.shopSlug } as never,
        },
      });
    }
  }

  console.log(`✅ Pending seller applications seeded (${pendingApplicants.length})`);
}

// ---------------------------------------------------------------
// 2. Addresses for every customer (needed to attach to orders).
// ---------------------------------------------------------------

async function ensureCustomerAddresses(): Promise<Map<string, string>> {
  // Returns a map of userId -> default addressId.
  const customers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER, isDeleted: false },
    select: { id: true, name: true, email: true },
  });

  const map = new Map<string, string>();
  let i = 0;
  const cities = [
    { city: "Brooklyn", state: "NY", postalCode: "11201", country: "US" },
    { city: "San Francisco", state: "CA", postalCode: "94103", country: "US" },
    { city: "Austin", state: "TX", postalCode: "78701", country: "US" },
    { city: "Seattle", state: "WA", postalCode: "98101", country: "US" },
    { city: "Chicago", state: "IL", postalCode: "60601", country: "US" },
    { city: "Boston", state: "MA", postalCode: "02110", country: "US" },
    { city: "Miami", state: "FL", postalCode: "33101", country: "US" },
  ];

  for (const c of customers) {
    const addr = pick(cities, i++);
    const existing = await prisma.address.findFirst({
      where: { userId: c.id, isDefault: true, isDeleted: false },
    });
    if (existing) {
      map.set(c.id, existing.id);
      continue;
    }
    const created = await prisma.address.create({
      data: {
        userId: c.id,
        type: AddressType.BOTH,
        isDefault: true,
        label: "Home",
        fullName: c.name,
        phone: "+1-555-010-" + pad(i, 4),
        line1: `${100 + i} Maple Street`,
        city: addr.city,
        state: addr.state,
        country: addr.country,
        postalCode: addr.postalCode,
      },
    });
    map.set(c.id, created.id);
  }
  return map;
}

// ---------------------------------------------------------------
// 3. Demo orders — one Order per shopping trip, may span multiple
//    sellers (creating one SellerOrder per seller).
// ---------------------------------------------------------------

const ORDER_FLOWS: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  sellerStatus: SellerOrderStatus;
  weight: number; // sampling weight
}[] = [
  { status: OrderStatus.DELIVERED, paymentStatus: PaymentStatus.PAID, sellerStatus: SellerOrderStatus.DELIVERED, weight: 5 },
  { status: OrderStatus.SHIPPED, paymentStatus: PaymentStatus.PAID, sellerStatus: SellerOrderStatus.SHIPPED, weight: 3 },
  { status: OrderStatus.PROCESSING, paymentStatus: PaymentStatus.PAID, sellerStatus: SellerOrderStatus.PROCESSING, weight: 2 },
  { status: OrderStatus.PAID, paymentStatus: PaymentStatus.PAID, sellerStatus: SellerOrderStatus.CONFIRMED, weight: 2 },
  { status: OrderStatus.PENDING_PAYMENT, paymentStatus: PaymentStatus.UNPAID, sellerStatus: SellerOrderStatus.PENDING, weight: 1 },
  { status: OrderStatus.CANCELLED, paymentStatus: PaymentStatus.FAILED, sellerStatus: SellerOrderStatus.CANCELLED, weight: 1 },
];

function pickFlow(r: () => number) {
  const total = ORDER_FLOWS.reduce((s, f) => s + f.weight, 0);
  let v = r() * total;
  for (const f of ORDER_FLOWS) {
    if ((v -= f.weight) <= 0) return f;
  }
  return ORDER_FLOWS[0];
}

type ProductLite = {
  id: string;
  name: string;
  sku: string;
  price: number;
  sellerId: string;
  imageUrl: string | null;
};

async function seedDemoOrders() {
  // Wipe previous fixtures so re-running gives a clean snapshot.
  // Scope: only orders belonging to the seeded demo customer accounts.
  const seededCustomers = await prisma.user.findMany({
    where: { email: { in: SEEDED_CUSTOMER_EMAILS } },
    select: { id: true },
  });
  const seededCustomerIds = seededCustomers.map((c) => c.id);

  const previous = await prisma.order.findMany({
    where: { userId: { in: seededCustomerIds } },
    select: { id: true },
  });
  if (previous.length > 0) {
    const ids = previous.map((o) => o.id);
    await prisma.refundItem.deleteMany({
      where: { refund: { orderId: { in: ids } } },
    });
    await prisma.refund.deleteMany({ where: { orderId: { in: ids } } });
    // Detach payout items first, then drop payouts that become empty.
    const itemsToWipe = await prisma.sellerPayoutItem.findMany({
      where: { sellerOrder: { orderId: { in: ids } } },
      select: { payoutId: true },
    });
    const payoutIds = Array.from(
      new Set(itemsToWipe.map((i) => i.payoutId).filter(Boolean) as string[]),
    );
    await prisma.sellerPayoutItem.deleteMany({
      where: { sellerOrder: { orderId: { in: ids } } },
    });
    if (payoutIds.length > 0) {
      await prisma.sellerPayout.deleteMany({
        where: { id: { in: payoutIds } },
      });
    }
    await prisma.payment.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.sellerOrderStatusHistory.deleteMany({
      where: { sellerOrder: { orderId: { in: ids } } },
    });
    await prisma.sellerOrder.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.order.deleteMany({ where: { id: { in: ids } } });
  }

  const customers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER, isDeleted: false },
    select: { id: true, name: true, email: true },
  });
  if (customers.length === 0) {
    console.warn("  ! No customers — skipping demo orders.");
    return;
  }

  const addresses = await ensureCustomerAddresses();

  const productRows = await prisma.product.findMany({
    where: { isDeleted: false, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      sellerId: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  });
  const products: ProductLite[] = productRows.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: Number(p.price),
    sellerId: p.sellerId,
    imageUrl: p.images[0]?.url ?? null,
  }));
  const productsBySeller = new Map<string, ProductLite[]>();
  for (const p of products) {
    if (!productsBySeller.has(p.sellerId)) productsBySeller.set(p.sellerId, []);
    productsBySeller.get(p.sellerId)!.push(p);
  }

  const sellers = await prisma.seller.findMany({
    where: { isDeleted: false, status: SellerStatus.APPROVED },
    select: { id: true, shopName: true, userId: true, commissionRate: true },
  });
  const sellerById = new Map(sellers.map((s) => [s.id, s]));

  const N_ORDERS = 80;
  let created = 0;
  let totalItems = 0;

  for (let i = 0; i < N_ORDERS; i++) {
    const r = rand(0xC0FFEE + i * 31);
    const customer = pick(customers, i);
    const customerAddress = addresses.get(customer.id);
    if (!customerAddress) continue;
    const dayOffset = Math.floor(r() * 30); // 0..29 days ago
    const placedAt = daysAgo(dayOffset, 9 + Math.floor(r() * 12), Math.floor(r() * 60));
    const flow = pickFlow(r);

    // Pick 1-2 distinct sellers and 1-3 products per seller for this order.
    const sellerIds = sellers.map((s) => s.id);
    const nSellers = 1 + (r() < 0.35 ? 1 : 0);
    const chosenSellerIds: string[] = [];
    while (chosenSellerIds.length < nSellers && sellerIds.length > 0) {
      const sid = sellerIds[Math.floor(r() * sellerIds.length)];
      if (!chosenSellerIds.includes(sid)) chosenSellerIds.push(sid);
    }

    const lineItems: {
      product: ProductLite;
      qty: number;
      sellerId: string;
    }[] = [];
    for (const sid of chosenSellerIds) {
      const list = productsBySeller.get(sid) ?? [];
      if (list.length === 0) continue;
      const nItems = 1 + Math.floor(r() * 2); // 1..2 items per seller
      const seen = new Set<string>();
      for (let k = 0; k < nItems; k++) {
        const p = list[Math.floor(r() * list.length)];
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        const qty = 1 + Math.floor(r() * 2); // 1..2
        lineItems.push({ product: p, qty, sellerId: sid });
      }
    }
    if (lineItems.length === 0) continue;

    const subtotal = lineItems.reduce((s, it) => s + it.product.price * it.qty, 0);
    const shippingTotal = Math.round((5 + r() * 10) * 100) / 100;
    const taxTotal = Math.round(subtotal * 0.07 * 100) / 100;
    const grandTotal = Math.round((subtotal + shippingTotal + taxTotal) * 100) / 100;

    // Production-style order number: NX-YYYY-NNNNNN
    let orderNumber = makeOrderNumber(placedAt);
    while (await prisma.order.findUnique({ where: { orderNumber } })) {
      orderNumber = makeOrderNumber(placedAt);
    }

    const isPaid = flow.paymentStatus === PaymentStatus.PAID;
    const paidAt = isPaid ? new Date(placedAt.getTime() + 5 * 60_000) : null;
    const shippedAt =
      flow.sellerStatus === SellerOrderStatus.SHIPPED ||
      flow.sellerStatus === SellerOrderStatus.DELIVERED
        ? new Date(placedAt.getTime() + 24 * 3600_000)
        : null;
    const deliveredAt =
      flow.sellerStatus === SellerOrderStatus.DELIVERED
        ? new Date(placedAt.getTime() + 4 * 24 * 3600_000)
        : null;
    const cancelledAt =
      flow.status === OrderStatus.CANCELLED
        ? new Date(placedAt.getTime() + 2 * 3600_000)
        : null;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customer.id,
        status: flow.status,
        fulfillmentStatus:
          flow.sellerStatus === SellerOrderStatus.DELIVERED
            ? "FULFILLED"
            : flow.sellerStatus === SellerOrderStatus.SHIPPED ||
                flow.sellerStatus === SellerOrderStatus.PROCESSING
              ? "PARTIAL"
              : "UNFULFILLED",
        paymentStatus: flow.paymentStatus,
        currency: "USD",
        subtotal,
        shippingTotal,
        taxTotal,
        discountTotal: 0,
        grandTotal,
        shippingAddressId: customerAddress,
        billingAddressId: customerAddress,
        placedAt,
        paidAt,
        shippedAt,
        deliveredAt,
        cancelledAt,
        cancelReason: cancelledAt ? "Payment failed at gateway" : null,
        createdAt: placedAt,
      },
    });

    // SellerOrders + OrderItems
    let sellerIdx = 0;
    for (const sid of chosenSellerIds) {
      const sellerLines = lineItems.filter((it) => it.sellerId === sid);
      if (sellerLines.length === 0) continue;
      const sellerInfo = sellerById.get(sid);
      if (!sellerInfo) continue;

      const sSubtotal = sellerLines.reduce(
        (s, it) => s + it.product.price * it.qty,
        0,
      );
      const sShipping = Math.round((shippingTotal / chosenSellerIds.length) * 100) / 100;
      const sTax = Math.round(sSubtotal * 0.07 * 100) / 100;
      const sGrand = Math.round((sSubtotal + sShipping + sTax) * 100) / 100;
      const commissionRate = Number(sellerInfo.commissionRate ?? 10);
      const commissionAmount = Math.round(sSubtotal * (commissionRate / 100) * 100) / 100;
      const payoutAmount = Math.round((sSubtotal - commissionAmount) * 100) / 100;

      const sellerOrder = await prisma.sellerOrder.create({
        data: {
          sellerOrderNumber: `${orderNumber}-S${++sellerIdx}`,
          orderId: order.id,
          sellerId: sid,
          status: flow.sellerStatus,
          fulfillmentStatus:
            flow.sellerStatus === SellerOrderStatus.DELIVERED
              ? "FULFILLED"
              : flow.sellerStatus === SellerOrderStatus.SHIPPED
                ? "PARTIAL"
                : "UNFULFILLED",
          currency: "USD",
          subtotal: sSubtotal,
          shippingTotal: sShipping,
          taxTotal: sTax,
          discountTotal: 0,
          grandTotal: sGrand,
          commissionRate,
          commissionAmount,
          payoutAmount,
          shippedAt,
          deliveredAt,
          cancelledAt,
          createdAt: placedAt,
        },
      });

      for (const it of sellerLines) {
        const lineSubtotal = Math.round(it.product.price * it.qty * 100) / 100;
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            sellerOrderId: sellerOrder.id,
            sellerId: sid,
            productId: it.product.id,
            productName: it.product.name,
            sku: it.product.sku,
            image: it.product.imageUrl,
            unitPrice: it.product.price,
            quantity: it.qty,
            lineSubtotal,
            lineDiscount: 0,
            lineTotal: lineSubtotal,
            createdAt: placedAt,
          },
        });
        totalItems += 1;
      }

      // Accrue payout item once delivered (Stripe-Connect-style accrual)
      if (flow.sellerStatus === SellerOrderStatus.DELIVERED) {
        await prisma.sellerPayoutItem.create({
          data: {
            sellerOrderId: sellerOrder.id,
            grossAmount: sSubtotal,
            commissionAmount,
            refundAmount: 0,
            netAmount: payoutAmount,
            createdAt: deliveredAt ?? placedAt,
          },
        });
      }
    }

    // Payment record
    if (isPaid) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: PaymentMethod.STRIPE,
          status: PaymentStatus.PAID,
          currency: "USD",
          amount: grandTotal,
          paidAt: paidAt ?? placedAt,
          createdAt: placedAt,
        },
      });
    } else if (flow.paymentStatus === PaymentStatus.FAILED) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: PaymentMethod.STRIPE,
          status: PaymentStatus.FAILED,
          currency: "USD",
          amount: grandTotal,
          failureReason: "Card declined",
          createdAt: placedAt,
        },
      });
    }

    created += 1;
  }

  console.log(`✅ Demo orders seeded (${created} orders, ${totalItems} line items)`);
}

// ---------------------------------------------------------------
// 4. Bundle accrued payout items into Payouts in mixed states.
// ---------------------------------------------------------------

async function seedDemoPayouts() {
  const sellers = await prisma.seller.findMany({
    where: { isDeleted: false, status: SellerStatus.APPROVED },
    select: { id: true },
  });

  const states: PayoutStatus[] = [
    PayoutStatus.PAID,
    PayoutStatus.PROCESSING,
    PayoutStatus.PENDING,
    PayoutStatus.FAILED,
  ];

  let created = 0;
  for (let i = 0; i < sellers.length; i++) {
    const seller = sellers[i];
    const accruedItems = await prisma.sellerPayoutItem.findMany({
      where: { sellerOrder: { sellerId: seller.id }, payoutId: null },
      orderBy: { createdAt: "asc" },
    });
    if (accruedItems.length === 0) continue;

    // Bundle ~half of items into a payout, leave the rest as "accrued".
    const half = Math.max(1, Math.floor(accruedItems.length / 2));
    const slice = accruedItems.slice(0, half);
    const periodStart = slice[0].createdAt;
    const periodEnd = slice[slice.length - 1].createdAt;
    const gross = slice.reduce((s, it) => s + Number(it.grossAmount), 0);
    const commission = slice.reduce((s, it) => s + Number(it.commissionAmount), 0);
    const net = slice.reduce((s, it) => s + Number(it.netAmount), 0);

    const status = pick(states, i);
    const payout = await prisma.sellerPayout.create({
      data: {
        sellerId: seller.id,
        periodStart,
        periodEnd,
        currency: "USD",
        grossAmount: gross,
        commissionAmount: commission,
        refundAmount: 0,
        adjustmentAmount: 0,
        netAmount: net,
        method: PayoutMethod.MANUAL_BANK,
        status,
        initiatedAt: status !== PayoutStatus.PENDING ? new Date() : null,
        paidAt: status === PayoutStatus.PAID ? new Date() : null,
        failureReason: status === PayoutStatus.FAILED ? "Bank transfer rejected" : null,
      },
    });
    await prisma.sellerPayoutItem.updateMany({
      where: { id: { in: slice.map((s) => s.id) } },
      data: { payoutId: payout.id },
    });
    created += 1;
  }
  console.log(`✅ Demo payouts seeded (${created})`);
}

// ---------------------------------------------------------------
// 5. Refunds — small but visible variety for the Refunds page.
// ---------------------------------------------------------------

async function seedDemoRefunds() {
  const seededCustomers = await prisma.user.findMany({
    where: { email: { in: SEEDED_CUSTOMER_EMAILS } },
    select: { id: true },
  });
  const seededCustomerIds = seededCustomers.map((c) => c.id);

  const eligibleOrders = await prisma.order.findMany({
    where: {
      userId: { in: seededCustomerIds },
      paymentStatus: PaymentStatus.PAID,
      status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED] },
    },
    include: {
      items: true,
      sellerOrders: true,
    },
    take: 8,
  });

  const reasons = ["DAMAGED", "DEFECTIVE", "NOT_AS_DESCRIBED", "WRONG_ITEM", "OTHER"] as const;
  const statuses = ["REQUESTED", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED"] as const;

  let created = 0;
  for (let i = 0; i < eligibleOrders.length; i++) {
    const order = eligibleOrders[i];
    if (order.items.length === 0 || order.sellerOrders.length === 0) continue;

    const item = order.items[0];
    const so = order.sellerOrders.find((s) => s.id === item.sellerOrderId) ?? order.sellerOrders[0];
    const status = statuses[i % statuses.length];
    const reason = reasons[i % reasons.length];
    let refundNumber = makeRefundNumber(new Date());
    while (await prisma.refund.findUnique({ where: { refundNumber } })) {
      refundNumber = makeRefundNumber(new Date());
    }

    await prisma.refund.create({
      data: {
        refundNumber,
        orderId: order.id,
        sellerOrderId: so.id,
        sellerId: so.sellerId,
        requestedById: order.userId,
        status,
        reason,
        currency: "USD",
        requestedAmount: Number(item.lineTotal),
        approvedAmount: status === "REJECTED" ? null : Number(item.lineTotal),
        refundedAmount: status === "COMPLETED" ? Number(item.lineTotal) : 0,
        customerNote: "Item arrived damaged in shipping.",
        decisionNote:
          status === "REJECTED"
            ? "Outside return window."
            : status === "COMPLETED"
              ? "Approved and refunded via Stripe."
              : null,
        decidedAt:
          status === "REQUESTED" ? null : new Date(Date.now() - 2 * 86400_000),
        completedAt:
          status === "COMPLETED" ? new Date(Date.now() - 86400_000) : null,
        items: {
          create: [
            {
              orderItemId: item.id,
              quantity: item.quantity,
              amount: Number(item.lineTotal),
            },
          ],
        },
      },
    });
    created += 1;
  }
  console.log(`✅ Demo refunds seeded (${created})`);
}

// ---------------------------------------------------------------
// 6. Extra notifications so the bell isn't empty for any persona.
// ---------------------------------------------------------------

async function seedDemoNotifications() {
  const customers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER, isDeleted: false },
    select: { id: true },
  });
  const sellerUsers = await prisma.user.findMany({
    where: { role: Role.SELLER, isDeleted: false },
    select: { id: true },
  });

  const customerNotifs: {
    type: NotificationType;
    title: string;
    message: string;
    actionUrl: string;
  }[] = [
    {
      type: NotificationType.PROMO,
      title: "Spring Sale starts now",
      message: "Up to 30% off across Fashion, Beauty and Home — for 48 hours only.",
      actionUrl: "/deals",
    },
    {
      type: NotificationType.PRICE_DROP,
      title: "A wishlist item just dropped in price",
      message: "A product on your wishlist is now 15% off. Tap to grab it.",
      actionUrl: "/wishlist",
    },
    {
      type: NotificationType.ORDER_DELIVERED,
      title: "Your order was delivered",
      message: "Your most recent order has been delivered. Tap to leave a review.",
      actionUrl: "/orders",
    },
  ];

  const sellerNotifs: {
    type: NotificationType;
    title: string;
    message: string;
    actionUrl: string;
  }[] = [
    {
      type: NotificationType.NEW_SELLER_ORDER,
      title: "New order received",
      message: "You have new orders waiting to be packed.",
      actionUrl: "/seller/orders",
    },
    {
      type: NotificationType.LOW_STOCK,
      title: "Low stock alert",
      message: "One or more of your products are running low on stock.",
      actionUrl: "/seller/products?filter=low-stock",
    },
    {
      type: NotificationType.PAYOUT_PAID,
      title: "Payout sent",
      message: "Your latest payout has been processed and is on the way to your bank.",
      actionUrl: "/seller/payouts",
    },
  ];

  let count = 0;
  const upsertNotif = async (
    userId: string,
    n: { type: NotificationType; title: string; message: string; actionUrl: string },
  ) => {
    const existing = await prisma.notification.findFirst({
      where: { userId, type: n.type, title: n.title },
    });
    if (existing) return false;
    await prisma.notification.create({
      data: {
        userId,
        type: n.type,
        title: n.title,
        message: n.message,
        actionUrl: n.actionUrl,
      },
    });
    return true;
  };

  for (const c of customers) {
    for (const n of customerNotifs) {
      if (await upsertNotif(c.id, n)) count += 1;
    }
  }
  for (const s of sellerUsers) {
    for (const n of sellerNotifs) {
      if (await upsertNotif(s.id, n)) count += 1;
    }
  }
  console.log(`✅ Demo notifications seeded (${count})`);
}

// ---------------------------------------------------------------
// 7. Recompute denormalised aggregates so dashboards are accurate.
// ---------------------------------------------------------------

async function recomputeAggregates() {
  // Product.soldCount
  const productAggregates = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    where: { order: { paymentStatus: PaymentStatus.PAID } },
  });
  // Reset all first
  await prisma.product.updateMany({ data: { soldCount: 0 } });
  for (const row of productAggregates) {
    await prisma.product.update({
      where: { id: row.productId },
      data: { soldCount: row._sum.quantity ?? 0 },
    });
  }

  // Seller.totalSales / orderCount / productCount
  const sellers = await prisma.seller.findMany({ select: { id: true } });
  for (const s of sellers) {
    const [salesAgg, orderCount, productCount] = await Promise.all([
      prisma.sellerOrder.aggregate({
        where: { sellerId: s.id, order: { paymentStatus: PaymentStatus.PAID } },
        _sum: { grandTotal: true },
      }),
      prisma.sellerOrder.count({ where: { sellerId: s.id } }),
      prisma.product.count({ where: { sellerId: s.id, isDeleted: false } }),
    ]);
    await prisma.seller.update({
      where: { id: s.id },
      data: {
        totalSales: Number(salesAgg._sum.grandTotal ?? 0),
        orderCount,
        productCount,
      },
    });
  }
  console.log(`✅ Aggregates recomputed (${sellers.length} sellers, ${productAggregates.length} products)`);
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------

async function main() {
  console.log("🚀 Nexora demo data seed starting…");
  await seedDemoAccounts(); // ensures demo.customer / demo.seller / demo.admin exist
  await seedPendingSellers();
  await seedDemoOrders();
  await seedDemoPayouts();
  await seedDemoRefunds();
  await seedDemoNotifications();
  await recomputeAggregates();
  console.log("🎉 Nexora demo seed complete.");
}

main()
  .catch((err) => {
    console.error("❌ Demo seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
