/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Big-picture demo data seeder.
 *
 * Tiers:
 *   - Marketplace (admin sees everything): many sellers, products,
 *     orders across all statuses, payouts in every state, refunds,
 *     low-stock products, notifications.
 *   - Demo seller `demo-shop`: ~10 products, several seller-orders,
 *     a refund request, accumulated payouts, Q&A.
 *   - Demo customer: 3 orders (delivered / shipped / refund-requested),
 *     a wishlist, 2 saved addresses, 1 active cart, a few reviews.
 *
 * Idempotent — running twice does not duplicate. Skips heavy seeding
 * if the catalog already has > 20 products (i.e. seeded once).
 */
import { prisma } from "../lib/prisma";
import { auth } from "../lib/auth";
import {
  AddressType,
  CartStatus,
  CouponDiscountType,
  FulfillmentStatus,
  KycStatus,
  NotificationType,
  OrderStatus,
  PayoutMethod,
  PayoutStatus,
  PaymentStatus,
  ProductCondition,
  ProductStatus,
  RefundReason,
  RefundStatus,
  ReviewStatus,
  Role,
  SellerOrderStatus,
  SellerStatus,
  UserStatus,
} from "../generated/enums";
import { round2, slugify, toNumber } from "./stringUtils";
import { DEMO_ACCOUNTS } from "./seed";

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------

const pad = (n: number, len = 6) => String(n).padStart(len, "0");

const ensureBetterAuthUser = async (params: {
  email: string;
  password: string;
  name: string;
}) => {
  const existing = await prisma.user.findUnique({
    where: { email: params.email },
  });
  if (existing) return existing;
  const created = await auth.api.signUpEmail({
    body: {
      email: params.email,
      password: params.password,
      name: params.name,
      rememberMe: false,
    },
  });
  return prisma.user.findUnique({ where: { id: created.user.id } });
};

const upsertCategory = async (
  name: string,
  parentSlug?: string
) => {
  const slug = slugify(name);
  const parent = parentSlug
    ? await prisma.category.findUnique({ where: { slug: parentSlug } })
    : null;
  return prisma.category.upsert({
    where: { slug },
    update: {},
    create: {
      name,
      slug,
      parentId: parent?.id ?? null,
      isActive: true,
      isFeatured: !parent,
    },
  });
};

const upsertBrand = async (name: string) => {
  const slug = slugify(name);
  return prisma.brand.upsert({
    where: { slug },
    update: {},
    create: { name, slug, isActive: true, isFeatured: true },
  });
};

const upsertSeller = async (params: {
  email: string;
  password: string;
  name: string;
  shopName: string;
  shopSlug: string;
  tagline: string;
  country?: string;
  commissionRate?: number;
  stripeOnboardingDone?: boolean;
}) => {
  const user = await ensureBetterAuthUser(params);
  if (!user) return null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      role: Role.SELLER,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    },
  });

  const seller = await prisma.seller.upsert({
    where: { userId: user.id },
    update: {
      status: SellerStatus.APPROVED,
      kycStatus: KycStatus.APPROVED,
      isDeleted: false,
      shopName: params.shopName,
      shopSlug: params.shopSlug,
      tagline: params.tagline,
      stripeOnboardingDone: params.stripeOnboardingDone ?? false,
    },
    create: {
      userId: user.id,
      shopName: params.shopName,
      shopSlug: params.shopSlug,
      tagline: params.tagline,
      description: `${params.shopName} — curated electronics and accessories on Nexora.`,
      contactEmail: params.email,
      country: params.country ?? "US",
      legalName: params.shopName,
      status: SellerStatus.APPROVED,
      kycStatus: KycStatus.APPROVED,
      payoutMethod: params.stripeOnboardingDone
        ? PayoutMethod.STRIPE_CONNECT
        : PayoutMethod.MANUAL_BANK,
      stripeOnboardingDone: params.stripeOnboardingDone ?? false,
      approvedAt: new Date(),
      commissionRate: params.commissionRate ?? 10,
    },
  });

  return { user, seller };
};

const upsertCustomer = async (params: {
  email: string;
  password: string;
  name: string;
}) => {
  const user = await ensureBetterAuthUser(params);
  if (!user) return null;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      role: Role.CUSTOMER,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    },
  });
  await prisma.customer.upsert({
    where: { userId: user.id },
    update: { fullName: params.name, email: params.email },
    create: { userId: user.id, fullName: params.name, email: params.email },
  });
  await prisma.wishlist
    .upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    })
    .catch(() => null);
  return user;
};

// -----------------------------------------------------------------
// Catalog
// -----------------------------------------------------------------

const PRODUCT_PALETTE = [
  // [name, brand, category, basePrice, weight, lowStock, stock, isOnSale]
  ["Aurora 14 Pro Laptop", "Nexora Tech", "Laptops", 1499, 1700, 3, 18, false],
  ["Stellar 16 Studio Laptop", "Nexora Tech", "Laptops", 2199, 2100, 2, 9, true],
  ["Quantum X Mini PC", "Nexora Tech", "Computers", 899, 800, 4, 25, false],
  ["Halo Wireless Earbuds", "Halo Audio", "Audio", 149, 60, 10, 84, true],
  ["Halo Studio Headphones", "Halo Audio", "Audio", 299, 320, 5, 42, false],
  ["Pulse Smart Speaker", "Halo Audio", "Audio", 119, 950, 4, 31, false],
  ["Orbit Smartwatch S2", "Orbit Wear", "Wearables", 249, 55, 6, 7, true], // low stock
  ["Orbit Fitness Band", "Orbit Wear", "Wearables", 79, 30, 8, 4, true], // low stock
  ["Lumen 4K Action Cam", "Lumen Imaging", "Cameras", 369, 220, 4, 22, false],
  ["Lumen Mirrorless Camera", "Lumen Imaging", "Cameras", 1299, 600, 2, 11, true],
  ["Voltix Power Bank 30k", "Voltix", "Accessories", 79, 540, 6, 60, false],
  ["Voltix USB-C Hub 8-in-1", "Voltix", "Accessories", 59, 120, 8, 0, false], // out of stock
  ["NexoSmart Doorbell Cam", "Nexora Home", "Smart Home", 199, 380, 5, 14, true],
  ["NexoSmart Hub Mini", "Nexora Home", "Smart Home", 89, 210, 4, 38, false],
  ["EcoCharge Solar Pad 20W", "Voltix", "Accessories", 109, 700, 4, 29, false],
  ["Aero Mechanical Keyboard", "Aero Peripherals", "Peripherals", 159, 980, 4, 17, false],
  ["Aero Pro Gaming Mouse", "Aero Peripherals", "Peripherals", 89, 110, 6, 33, true],
  ["NexoLens AR Glasses", "Nexora Tech", "Wearables", 599, 90, 2, 6, false], // low stock
  ["Halo Noise-Cancel Mini", "Halo Audio", "Audio", 199, 200, 6, 50, false],
  ["Quantum Dock Pro", "Nexora Tech", "Accessories", 229, 480, 4, 21, false],
  ["Pulse Soundbar 2.1", "Halo Audio", "Audio", 349, 3400, 3, 12, true],
  ["Orbit Active GPS Watch", "Orbit Wear", "Wearables", 329, 70, 4, 18, false],
  ["Lumen Drone Air 2", "Lumen Imaging", "Cameras", 899, 600, 3, 8, false], // low stock
  ["Voltix Cable Pack 6-pc", "Voltix", "Accessories", 29, 250, 12, 200, false],
  ["NexoSmart Smart Plug 4-pk", "Nexora Home", "Smart Home", 39, 160, 10, 90, false],
  ["Aero Curve Monitor 34\"", "Aero Peripherals", "Peripherals", 549, 7800, 2, 9, true],
  ["NexoSecure Smart Lock", "Nexora Home", "Smart Home", 269, 800, 3, 15, false],
  ["Halo Microphone Pro", "Halo Audio", "Audio", 169, 360, 5, 25, false],
  ["Voltix Wireless Charger 3-in-1", "Voltix", "Accessories", 69, 290, 8, 56, true],
  ["Lumen Webcam 4K", "Lumen Imaging", "Cameras", 149, 130, 6, 31, false],
] as const;

// -----------------------------------------------------------------
// Main seeder
// -----------------------------------------------------------------

export const seedComprehensiveDemoData = async () => {
  // Skip on subsequent boots once we already have a populated catalog.
  const existingProducts = await prisma.product.count();
  if (existingProducts > 20) {
    console.log(
      `[demo] catalog already has ${existingProducts} products — skipping big seed`
    );
    return;
  }

  console.log("[demo] seeding comprehensive marketplace data…");

  // ---------- Categories ----------
  const cats = await Promise.all([
    upsertCategory("Electronics"),
    upsertCategory("Smart Home"),
  ]);
  const electronics = cats[0];
  const smartHome = cats[1];

  // children
  const Laptops = await upsertCategory("Laptops", electronics.slug);
  const Computers = await upsertCategory("Computers", electronics.slug);
  const Audio = await upsertCategory("Audio", electronics.slug);
  const Wearables = await upsertCategory("Wearables", electronics.slug);
  const Cameras = await upsertCategory("Cameras", electronics.slug);
  const Peripherals = await upsertCategory("Peripherals", electronics.slug);
  const Accessories = await upsertCategory("Accessories", electronics.slug);
  // smart home is its own top-level
  const SmartHomeChild = await upsertCategory("Smart Home Devices", smartHome.slug);

  const categoryByLabel: Record<string, { id: string }> = {
    Laptops,
    Computers,
    Audio,
    Wearables,
    Cameras,
    Peripherals,
    Accessories,
    "Smart Home": SmartHomeChild,
  };

  // ---------- Brands ----------
  const brandLabels = [
    "Nexora Tech",
    "Halo Audio",
    "Orbit Wear",
    "Lumen Imaging",
    "Voltix",
    "Nexora Home",
    "Aero Peripherals",
  ];
  const brandMap: Record<string, { id: string }> = {};
  for (const b of brandLabels) {
    brandMap[b] = await upsertBrand(b);
  }

  // ---------- Sellers ----------
  const demoSellerEntry = await prisma.seller.findUnique({
    where: { userId: undefined as any }, // placeholder, we look up via shopSlug
  }).catch(() => null);
  // Look up by shopSlug instead
  const demoShopSeller = await prisma.seller.findUnique({
    where: { shopSlug: DEMO_ACCOUNTS.seller.shopSlug },
  });
  if (!demoShopSeller) {
    console.warn("[demo] demo seller missing — was seedDemoAccounts run first?");
    return;
  }

  const extraSellers = await Promise.all([
    upsertSeller({
      email: "halo.audio@nexora.dev",
      password: "Demo@1234",
      name: "Halo Audio Co.",
      shopName: "Halo Audio Store",
      shopSlug: "halo-audio",
      tagline: "Studio-grade headphones, IEMs and home sound",
      stripeOnboardingDone: true,
    }),
    upsertSeller({
      email: "voltix@nexora.dev",
      password: "Demo@1234",
      name: "Voltix Power",
      shopName: "Voltix Power",
      shopSlug: "voltix-power",
      tagline: "Charge anything, anywhere",
      stripeOnboardingDone: false,
    }),
    upsertSeller({
      email: "lumen.imaging@nexora.dev",
      password: "Demo@1234",
      name: "Lumen Imaging",
      shopName: "Lumen Imaging",
      shopSlug: "lumen-imaging",
      tagline: "Cameras, drones and creator gear",
      stripeOnboardingDone: true,
      country: "GB",
    }),
    upsertSeller({
      email: "aero.peripherals@nexora.dev",
      password: "Demo@1234",
      name: "Aero Peripherals",
      shopName: "Aero Peripherals",
      shopSlug: "aero-peripherals",
      tagline: "Mechanical keyboards, mice and monitors",
      commissionRate: 12,
      stripeOnboardingDone: false,
    }),
    upsertSeller({
      email: "nexora.home@nexora.dev",
      password: "Demo@1234",
      name: "Nexora Home",
      shopName: "Nexora Home",
      shopSlug: "nexora-home",
      tagline: "Connected home, made calm",
      stripeOnboardingDone: true,
    }),
  ]);

  const allSellers = [
    {
      sellerId: demoShopSeller.id,
      userId: demoShopSeller.userId,
      shopName: demoShopSeller.shopName,
    },
    ...extraSellers
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => ({
        sellerId: s.seller.id,
        userId: s.seller.userId,
        shopName: s.seller.shopName,
      })),
  ];

  // Map shop name -> seller (for product distribution)
  const sellerByShop: Record<
    string,
    { sellerId: string; userId: string; shopName: string }
  > = {};
  for (const s of allSellers) sellerByShop[s.shopName] = s;

  // The "demo-shop" seller takes ANYTHING with brand "Nexora Tech" so they
  // get a meaty catalog. Others map by brand.
  const brandToShop: Record<string, string> = {
    "Nexora Tech": "Demo Shop",
    "Halo Audio": "Halo Audio Store",
    "Voltix": "Voltix Power",
    "Lumen Imaging": "Lumen Imaging",
    "Aero Peripherals": "Aero Peripherals",
    "Nexora Home": "Nexora Home",
    "Orbit Wear": "Halo Audio Store", // give Halo a 2nd brand for variety
  };

  // ---------- Products ----------
  const createdProducts: Array<{
    id: string;
    name: string;
    sku: string;
    sellerId: string;
    price: number;
    currency: string;
  }> = [];

  for (let i = 0; i < PRODUCT_PALETTE.length; i++) {
    const [name, brand, catLabel, price, weight, lowStock, stock, isOnSale] =
      PRODUCT_PALETTE[i];
    const slug = slugify(name as string);
    const sku = `NX-${pad(i + 1, 4)}-${(brand as string)
      .toUpperCase()
      .slice(0, 3)}`;

    const sellerKey = brandToShop[brand as string] ?? "Demo Shop";
    const seller = sellerByShop[sellerKey] ?? sellerByShop["Demo Shop"];
    const cat = categoryByLabel[catLabel as string] ?? Accessories;
    const br = brandMap[brand as string];

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      createdProducts.push({
        id: existing.id,
        name: existing.name,
        sku: existing.sku,
        sellerId: existing.sellerId,
        price: toNumber(existing.price),
        currency: existing.currency,
      });
      continue;
    }

    const created = await prisma.product.create({
      data: {
        name: name as string,
        slug,
        sku,
        shortDesc: `${name} — premium ${(catLabel as string).toLowerCase()} from ${brand}.`,
        description: `## ${name}\n\nFlagship ${(catLabel as string).toLowerCase()} from ${brand}. Designed for the Nexora marketplace demo. Includes a 1-year warranty and 30-day return window.`,
        price: price as number,
        compareAtPrice: isOnSale
          ? round2((price as number) * 1.25)
          : undefined,
        currency: "USD",
        stock: stock as number,
        lowStockAlert: lowStock as number,
        trackInventory: true,
        weightGrams: weight as number,
        status:
          (stock as number) === 0
            ? ProductStatus.OUT_OF_STOCK
            : ProductStatus.ACTIVE,
        condition: ProductCondition.NEW,
        isFeatured: i % 5 === 0,
        isBestseller: i % 4 === 0,
        isNewArrival: i % 6 === 0,
        isOnSale: !!isOnSale,
        sellerId: seller.sellerId,
        brandId: br.id,
        categoryId: cat.id,
        publishedAt: new Date(),
        images: {
          create: [
            {
              url: `https://picsum.photos/seed/${encodeURIComponent(slug)}/640/640`,
              alt: name as string,
              isPrimary: true,
              sortOrder: 0,
            },
            {
              url: `https://picsum.photos/seed/${encodeURIComponent(slug)}-2/640/640`,
              alt: `${name} alt`,
              sortOrder: 1,
            },
          ],
        },
        specifications: {
          create: [
            {
              group: "General",
              label: "Brand",
              value: brand as string,
              sortOrder: 0,
            },
            {
              group: "General",
              label: "Warranty",
              value: "12 months",
              sortOrder: 1,
            },
            {
              group: "Physical",
              label: "Weight",
              value: `${weight} g`,
              sortOrder: 2,
            },
          ],
        },
      },
    });

    await prisma.seller.update({
      where: { id: seller.sellerId },
      data: { productCount: { increment: 1 } },
    });

    createdProducts.push({
      id: created.id,
      name: created.name,
      sku: created.sku,
      sellerId: created.sellerId,
      price: toNumber(created.price),
      currency: created.currency,
    });
  }

  // ---------- Coupon ----------
  await prisma.coupon
    .upsert({
      where: { code: "NEXORA10" },
      update: {},
      create: {
        code: "NEXORA10",
        description: "10% off site-wide",
        discountType: CouponDiscountType.PERCENT,
        discountValue: 10,
        minOrderAmount: 50,
        maxDiscount: 100,
        usageLimit: 1000,
        usedCount: 0,
        isActive: true,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 90 * 86400_000),
      },
    })
    .catch(() => null);

  // ---------- Customers ----------
  const customerEmails = [
    ["alice.morgan@example.com", "Alice Morgan"],
    ["ben.taylor@example.com", "Ben Taylor"],
    ["chen.li@example.com", "Chen Li"],
    ["diego.santos@example.com", "Diego Santos"],
    ["eve.fisher@example.com", "Eve Fisher"],
    ["farah.khan@example.com", "Farah Khan"],
    ["george.miller@example.com", "George Miller"],
    ["hana.suzuki@example.com", "Hana Suzuki"],
    ["ivan.petrov@example.com", "Ivan Petrov"],
    ["julia.rossi@example.com", "Julia Rossi"],
    ["kabir.patel@example.com", "Kabir Patel"],
    ["lena.schmidt@example.com", "Lena Schmidt"],
  ] as const;

  const customers: { id: string; email: string; name: string }[] = [];
  for (const [email, name] of customerEmails) {
    const u = await upsertCustomer({ email, password: "Demo@1234", name });
    if (u) customers.push({ id: u.id, email: u.email, name: u.name });
  }

  // demo customer
  const demoCustomerUser = await prisma.user.findUnique({
    where: { email: DEMO_ACCOUNTS.customer.email },
  });

  // ---------- Addresses for everyone ----------
  const seedAddress = async (
    userId: string,
    label: string,
    fullName: string,
    line1: string,
    city: string,
    state: string,
    country: string,
    isDefault = false
  ) => {
    const exists = await prisma.address.findFirst({
      where: { userId, label },
    });
    if (exists) return exists;
    return prisma.address.create({
      data: {
        userId,
        type: AddressType.BOTH,
        isDefault,
        label,
        fullName,
        phone: "+15551234567",
        line1,
        city,
        state,
        country,
        postalCode: "94016",
      },
    });
  };

  for (const c of customers) {
    await seedAddress(c.id, "Home", c.name, "123 Market St", "San Francisco", "CA", "US", true);
  }
  if (demoCustomerUser) {
    await seedAddress(
      demoCustomerUser.id,
      "Home",
      DEMO_ACCOUNTS.customer.name,
      "742 Evergreen Terrace",
      "San Francisco",
      "CA",
      "US",
      true
    );
    await seedAddress(
      demoCustomerUser.id,
      "Office",
      DEMO_ACCOUNTS.customer.name,
      "1 Embarcadero Center",
      "San Francisco",
      "CA",
      "US",
      false
    );
  }

  // ---------- Orders ----------
  // We'll generate a spread of orders across the marketplace. Each order
  // contains 1-3 items from possibly different sellers, and lands in
  // various statuses to populate the admin/seller dashboards.
  const STATUS_DISTRIBUTION: Array<{
    order: OrderStatus;
    sellerOrder: SellerOrderStatus;
    payment: PaymentStatus;
    deliveredOffsetDays?: number;
  }> = [
    { order: OrderStatus.DELIVERED, sellerOrder: SellerOrderStatus.DELIVERED, payment: PaymentStatus.PAID, deliveredOffsetDays: 30 },
    { order: OrderStatus.DELIVERED, sellerOrder: SellerOrderStatus.DELIVERED, payment: PaymentStatus.PAID, deliveredOffsetDays: 21 },
    { order: OrderStatus.DELIVERED, sellerOrder: SellerOrderStatus.DELIVERED, payment: PaymentStatus.PAID, deliveredOffsetDays: 14 },
    { order: OrderStatus.DELIVERED, sellerOrder: SellerOrderStatus.DELIVERED, payment: PaymentStatus.PAID, deliveredOffsetDays: 10 },
    { order: OrderStatus.SHIPPED, sellerOrder: SellerOrderStatus.SHIPPED, payment: PaymentStatus.PAID },
    { order: OrderStatus.SHIPPED, sellerOrder: SellerOrderStatus.OUT_FOR_DELIVERY, payment: PaymentStatus.PAID },
    { order: OrderStatus.PROCESSING, sellerOrder: SellerOrderStatus.PROCESSING, payment: PaymentStatus.PAID },
    { order: OrderStatus.PROCESSING, sellerOrder: SellerOrderStatus.PACKED, payment: PaymentStatus.PAID },
    { order: OrderStatus.PAID, sellerOrder: SellerOrderStatus.CONFIRMED, payment: PaymentStatus.PAID },
    { order: OrderStatus.PAID, sellerOrder: SellerOrderStatus.CONFIRMED, payment: PaymentStatus.PAID },
    { order: OrderStatus.PENDING_PAYMENT, sellerOrder: SellerOrderStatus.PENDING, payment: PaymentStatus.UNPAID },
    { order: OrderStatus.CANCELLED, sellerOrder: SellerOrderStatus.CANCELLED, payment: PaymentStatus.FAILED },
  ];

  // Each customer gets 2-3 orders from the distribution, cycling.
  const orderRecipes: Array<{
    userId: string;
    addressId: string;
    statusIdx: number;
    productIds: string[];
  }> = [];

  for (let ci = 0; ci < customers.length; ci++) {
    const customer = customers[ci];
    const addr = await prisma.address.findFirst({
      where: { userId: customer.id },
    });
    if (!addr) continue;

    const ordersForCustomer = (ci % 3) + 2; // 2..4 orders
    for (let oi = 0; oi < ordersForCustomer; oi++) {
      const statusIdx = (ci + oi) % STATUS_DISTRIBUTION.length;
      const itemCount = (oi % 3) + 1; // 1..3 items
      const pidx = (ci * 3 + oi) % createdProducts.length;
      const productIds: string[] = [];
      for (let k = 0; k < itemCount; k++) {
        productIds.push(createdProducts[(pidx + k) % createdProducts.length].id);
      }
      orderRecipes.push({
        userId: customer.id,
        addressId: addr.id,
        statusIdx,
        productIds,
      });
    }
  }

  // demo customer dedicated orders (small set with mixed statuses)
  if (demoCustomerUser) {
    const addr = await prisma.address.findFirst({
      where: { userId: demoCustomerUser.id, isDefault: true },
    });
    if (addr) {
      const tripletProductIdx = [0, 4, 8]; // 3 distinct
      // 1) DELIVERED order (eligible for review/refund)
      orderRecipes.push({
        userId: demoCustomerUser.id,
        addressId: addr.id,
        statusIdx: 0,
        productIds: [createdProducts[tripletProductIdx[0]].id],
      });
      // 2) SHIPPED in transit
      orderRecipes.push({
        userId: demoCustomerUser.id,
        addressId: addr.id,
        statusIdx: 4,
        productIds: [
          createdProducts[tripletProductIdx[1]].id,
          createdProducts[tripletProductIdx[2]].id,
        ],
      });
      // 3) DELIVERED (will request a refund on this one)
      orderRecipes.push({
        userId: demoCustomerUser.id,
        addressId: addr.id,
        statusIdx: 1,
        productIds: [createdProducts[2].id],
      });
    }
  }

  console.log(`[demo] generating ${orderRecipes.length} orders…`);

  let orderCounter = await prisma.order.count();
  const createdOrders: Array<{
    id: string;
    orderNumber: string;
    userId: string;
    grandTotal: number;
    sellerOrders: Array<{ id: string; sellerId: string; subtotal: number }>;
    status: OrderStatus;
    productIds: string[];
  }> = [];

  for (const recipe of orderRecipes) {
    orderCounter += 1;
    const orderNumber = `NX-${new Date().getFullYear()}-${pad(orderCounter)}`;

    // Resolve products + group by seller
    const products = await prisma.product.findMany({
      where: { id: { in: recipe.productIds } },
    });
    if (!products.length) continue;

    const groups = new Map<string, typeof products>();
    for (const p of products) {
      const arr = groups.get(p.sellerId) ?? [];
      arr.push(p);
      groups.set(p.sellerId, arr);
    }

    let subtotal = 0;
    const sellerRollups: Array<{
      sellerId: string;
      products: typeof products;
      subtotal: number;
      shipping: number;
      tax: number;
      grandTotal: number;
      commissionRate: number;
      commissionAmount: number;
      payoutAmount: number;
    }> = [];

    for (const [sellerId, ps] of groups) {
      const sub = round2(ps.reduce((s, p) => s + toNumber(p.price), 0));
      const shipping = sub >= 50 ? 0 : 5;
      const tax = round2(sub * 0.08);
      const grand = round2(sub + shipping + tax);
      const commission = round2(sub * 0.1);
      sellerRollups.push({
        sellerId,
        products: ps,
        subtotal: sub,
        shipping,
        tax,
        grandTotal: grand,
        commissionRate: 10,
        commissionAmount: commission,
        payoutAmount: round2(sub - commission),
      });
      subtotal += sub;
    }

    const recipeStatus = STATUS_DISTRIBUTION[recipe.statusIdx];
    const placedAt = new Date(
      Date.now() - ((recipeStatus.deliveredOffsetDays ?? 0) + 1) * 86400_000
    );
    const deliveredAt = recipeStatus.deliveredOffsetDays
      ? new Date(Date.now() - recipeStatus.deliveredOffsetDays * 86400_000)
      : null;

    const grandTotal = round2(
      sellerRollups.reduce((s, r) => s + r.grandTotal, 0)
    );

    // Build Order + SellerOrders + OrderItems atomically
    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: recipe.userId,
          status: recipeStatus.order,
          fulfillmentStatus:
            recipeStatus.order === OrderStatus.DELIVERED
              ? FulfillmentStatus.FULFILLED
              : FulfillmentStatus.UNFULFILLED,
          paymentStatus: recipeStatus.payment,
          currency: "USD",
          subtotal: round2(subtotal),
          shippingTotal: round2(
            sellerRollups.reduce((s, r) => s + r.shipping, 0)
          ),
          taxTotal: round2(sellerRollups.reduce((s, r) => s + r.tax, 0)),
          discountTotal: 0,
          grandTotal,
          shippingAddressId: recipe.addressId,
          billingAddressId: recipe.addressId,
          placedAt,
          paidAt: recipeStatus.payment === PaymentStatus.PAID ? placedAt : null,
          deliveredAt,
        },
      });

      const sellerOrderRows: Array<{ id: string; sellerId: string; subtotal: number }> = [];
      let idx = 0;
      for (const r of sellerRollups) {
        idx += 1;
        const so = await tx.sellerOrder.create({
          data: {
            sellerOrderNumber: `${orderNumber}-S${idx}`,
            orderId: order.id,
            sellerId: r.sellerId,
            status: recipeStatus.sellerOrder,
            fulfillmentStatus:
              recipeStatus.sellerOrder === SellerOrderStatus.DELIVERED
                ? FulfillmentStatus.FULFILLED
                : FulfillmentStatus.UNFULFILLED,
            currency: "USD",
            subtotal: r.subtotal,
            shippingTotal: r.shipping,
            taxTotal: r.tax,
            discountTotal: 0,
            grandTotal: r.grandTotal,
            commissionRate: r.commissionRate,
            commissionAmount: r.commissionAmount,
            payoutAmount: r.payoutAmount,
            shippedAt:
              recipeStatus.sellerOrder === SellerOrderStatus.SHIPPED ||
              recipeStatus.sellerOrder === SellerOrderStatus.OUT_FOR_DELIVERY ||
              recipeStatus.sellerOrder === SellerOrderStatus.DELIVERED
                ? new Date(placedAt.getTime() + 86400_000)
                : null,
            deliveredAt:
              recipeStatus.sellerOrder === SellerOrderStatus.DELIVERED
                ? deliveredAt
                : null,
          },
        });
        sellerOrderRows.push({
          id: so.id,
          sellerId: r.sellerId,
          subtotal: r.subtotal,
        });

        for (const p of r.products) {
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              sellerOrderId: so.id,
              sellerId: r.sellerId,
              productId: p.id,
              productName: p.name,
              sku: p.sku,
              unitPrice: p.price,
              quantity: 1,
              lineSubtotal: p.price,
              lineDiscount: 0,
              lineTotal: p.price,
            },
          });
        }
        await tx.sellerOrderStatusHistory.create({
          data: {
            sellerOrderId: so.id,
            toStatus: recipeStatus.sellerOrder,
            note: "Demo seed",
          },
        });
      }

      // Payment record (for paid / failed orders)
      if (recipeStatus.payment !== PaymentStatus.UNPAID) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            method: "STRIPE" as any,
            status: recipeStatus.payment,
            currency: "USD",
            amount: grandTotal,
            paidAt: placedAt,
            stripePaymentIntentId: `pi_demo_${order.id.slice(0, 12)}`,
          },
        });
      }

      // Order history rows
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          toStatus: recipeStatus.order,
          note: "Demo seed",
        },
      });

      // Bump aggregates
      for (const r of sellerRollups) {
        await tx.seller.update({
          where: { id: r.sellerId },
          data: {
            orderCount: { increment: 1 },
            totalSales:
              recipeStatus.payment === PaymentStatus.PAID
                ? { increment: r.subtotal }
                : undefined,
          },
        });
        for (const p of r.products) {
          await tx.product.update({
            where: { id: p.id },
            data: {
              soldCount:
                recipeStatus.payment === PaymentStatus.PAID
                  ? { increment: 1 }
                  : undefined,
              viewCount: { increment: Math.floor(Math.random() * 10) + 1 },
            },
          });
        }
      }

      // Accrue payout items for delivered seller-orders
      if (recipeStatus.sellerOrder === SellerOrderStatus.DELIVERED) {
        for (const so of sellerOrderRows) {
          const r = sellerRollups.find((x) => x.sellerId === so.sellerId)!;
          await tx.sellerPayoutItem.create({
            data: {
              sellerOrderId: so.id,
              grossAmount: r.subtotal,
              commissionAmount: r.commissionAmount,
              refundAmount: 0,
              netAmount: r.payoutAmount,
            },
          });
        }
      }

      return { order, sellerOrderRows };
    });

    createdOrders.push({
      id: created.order.id,
      orderNumber: created.order.orderNumber,
      userId: recipe.userId,
      grandTotal,
      sellerOrders: created.sellerOrderRows,
      status: recipeStatus.order,
      productIds: recipe.productIds,
    });
  }

  // ---------- Reviews ----------
  const reviewable = createdOrders.filter(
    (o) => o.status === OrderStatus.DELIVERED
  );
  for (let i = 0; i < Math.min(reviewable.length, 10); i++) {
    const order = reviewable[i];
    const items = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      take: 1,
    });
    if (!items.length) continue;
    const it = items[0];
    const exists = await prisma.review.findFirst({
      where: { userId: order.userId, orderItemId: it.id },
    });
    if (exists) continue;
    await prisma.review
      .create({
        data: {
          productId: it.productId,
          userId: order.userId,
          orderItemId: it.id,
          rating: ((i % 3) + 3) as number, // 3..5
          title: i % 2 === 0 ? "Great purchase" : "Loving it so far",
          comment:
            i % 2 === 0
              ? "Arrived quickly, build quality is excellent."
              : "Exactly as described. Would buy again.",
          status: ReviewStatus.APPROVED,
          helpfulCount: Math.floor(Math.random() * 30),
        },
      })
      .catch(() => null);

    // Bump product aggregate
    await prisma.product
      .update({
        where: { id: it.productId },
        data: {
          reviewCount: { increment: 1 },
        },
      })
      .catch(() => null);
  }

  // Recompute avgRating per product (simple SQL)
  await prisma.$executeRawUnsafe(`
    UPDATE products p
    SET "avgRating" = sub.avg_rating
    FROM (
      SELECT "productId", ROUND(AVG(rating)::numeric, 2) AS avg_rating
      FROM reviews
      WHERE status = 'APPROVED'
      GROUP BY "productId"
    ) sub
    WHERE p.id = sub."productId"
  `);

  // ---------- Q&A ----------
  // Demo customer asks one unanswered question; staff/seller answers others.
  const qaProductSamples = createdProducts.slice(0, 6);
  for (let i = 0; i < qaProductSamples.length; i++) {
    const p = qaProductSamples[i];
    const asker = customers[i % customers.length];
    if (!asker) continue;
    const exists = await prisma.productQuestion.findFirst({
      where: { productId: p.id, userId: asker.id },
    });
    if (exists) continue;
    const q = await prisma.productQuestion.create({
      data: {
        productId: p.id,
        userId: asker.id,
        question: [
          "Is this compatible with macOS Sonoma?",
          "Does it ship to Canada?",
          "What's the warranty period?",
          "Is the case included?",
          "Battery life on a single charge?",
          "Can I pair it with two devices at once?",
        ][i],
      },
    });
    if (i % 2 === 0) {
      const sellerUser = allSellers.find((s) => s.sellerId === p.sellerId)!;
      await prisma.productAnswer.create({
        data: {
          questionId: q.id,
          userId: sellerUser.userId,
          answer: "Yes — confirmed by our team. Reach out if you have more questions!",
          isOfficial: true,
        },
      });
      await prisma.productQuestion.update({
        where: { id: q.id },
        data: { isAnswered: true },
      });
    }
  }
  // Demo customer's unanswered question
  if (demoCustomerUser) {
    const p = createdProducts[0];
    const exists = await prisma.productQuestion.findFirst({
      where: { productId: p.id, userId: demoCustomerUser.id },
    });
    if (!exists) {
      await prisma.productQuestion.create({
        data: {
          productId: p.id,
          userId: demoCustomerUser.id,
          question: "Does this come with a US power adapter?",
        },
      });
    }
  }

  // ---------- Refunds ----------
  // Pick a few delivered orders and seed refunds in different states.
  const refundCandidates = createdOrders.filter(
    (o) => o.status === OrderStatus.DELIVERED && o.sellerOrders.length > 0
  );

  const seedRefund = async (
    orderId: string,
    sellerOrderId: string,
    sellerId: string,
    requestedById: string,
    refundStatus: RefundStatus,
    counter: number
  ) => {
    const exists = await prisma.refund.findFirst({
      where: { orderId, sellerOrderId },
    });
    if (exists) return;
    const items = await prisma.orderItem.findMany({
      where: { sellerOrderId },
      take: 1,
    });
    if (!items.length) return;
    const it = items[0];
    const amount = toNumber(it.unitPrice);

    const refundNumber = `RF-${new Date().getFullYear()}-${pad(counter)}`;
    await prisma.refund.create({
      data: {
        refundNumber,
        orderId,
        sellerOrderId,
        sellerId,
        requestedById,
        status: refundStatus,
        reason: RefundReason.DEFECTIVE,
        customerNote: "Item arrived with a small defect.",
        currency: "USD",
        requestedAmount: amount,
        approvedAmount:
          refundStatus === RefundStatus.REQUESTED ? null : amount,
        refundedAmount:
          refundStatus === RefundStatus.COMPLETED ? amount : 0,
        decidedAt:
          refundStatus === RefundStatus.REQUESTED ? null : new Date(),
        completedAt:
          refundStatus === RefundStatus.COMPLETED ? new Date() : null,
        items: {
          create: [
            {
              orderItemId: it.id,
              quantity: 1,
              amount,
            },
          ],
        },
      },
    });
  };

  let refundCounter = await prisma.refund.count();
  for (let i = 0; i < Math.min(refundCandidates.length, 4); i++) {
    refundCounter += 1;
    const order = refundCandidates[i];
    const so = order.sellerOrders[0];
    const statuses = [
      RefundStatus.REQUESTED,
      RefundStatus.APPROVED,
      RefundStatus.COMPLETED,
      RefundStatus.REJECTED,
    ];
    await seedRefund(
      order.id,
      so.id,
      so.sellerId,
      order.userId,
      statuses[i % statuses.length],
      refundCounter
    );
  }

  // Demo customer pending refund on their 3rd dedicated order
  if (demoCustomerUser) {
    refundCounter += 1;
    const dcOrder = createdOrders
      .filter((o) => o.userId === demoCustomerUser.id)
      .pop();
    if (dcOrder && dcOrder.sellerOrders.length) {
      const so = dcOrder.sellerOrders[0];
      await seedRefund(
        dcOrder.id,
        so.id,
        so.sellerId,
        demoCustomerUser.id,
        RefundStatus.REQUESTED,
        refundCounter
      );
    }
  }

  // ---------- Payouts ----------
  // For each non-demo seller, generate one payout in PENDING/PROCESSING/PAID
  // states. Picks up unpaid SellerPayoutItems.
  const payoutStatusCycle = [
    PayoutStatus.PENDING,
    PayoutStatus.PROCESSING,
    PayoutStatus.PAID,
    PayoutStatus.FAILED,
  ];
  let psIdx = 0;
  for (const seller of allSellers) {
    const unpaidItems = await prisma.sellerPayoutItem.findMany({
      where: {
        payoutId: null,
        sellerOrder: { sellerId: seller.sellerId },
      },
    });
    if (unpaidItems.length === 0) continue;

    const gross = round2(unpaidItems.reduce((s, i) => s + toNumber(i.grossAmount), 0));
    const commission = round2(
      unpaidItems.reduce((s, i) => s + toNumber(i.commissionAmount), 0)
    );
    const net = round2(unpaidItems.reduce((s, i) => s + toNumber(i.netAmount), 0));
    const status = payoutStatusCycle[psIdx % payoutStatusCycle.length];
    psIdx += 1;

    const payout = await prisma.sellerPayout.create({
      data: {
        sellerId: seller.sellerId,
        periodStart: new Date(Date.now() - 30 * 86400_000),
        periodEnd: new Date(),
        currency: "USD",
        grossAmount: gross,
        commissionAmount: commission,
        refundAmount: 0,
        adjustmentAmount: 0,
        netAmount: net,
        method: PayoutMethod.MANUAL_BANK,
        status,
        paidAt: status === PayoutStatus.PAID ? new Date() : null,
        failureReason:
          status === PayoutStatus.FAILED ? "Demo: Bank rejected the wire" : null,
        bankReference:
          status === PayoutStatus.PAID ? `WIRE-${pad(psIdx)}` : null,
      },
    });
    await prisma.sellerPayoutItem.updateMany({
      where: { id: { in: unpaidItems.map((i) => i.id) } },
      data: { payoutId: payout.id },
    });
  }

  // ---------- Demo customer wishlist + cart ----------
  if (demoCustomerUser) {
    const wl = await prisma.wishlist.upsert({
      where: { userId: demoCustomerUser.id },
      update: {},
      create: { userId: demoCustomerUser.id },
    });
    for (let i = 0; i < 5; i++) {
      const p = createdProducts[(i * 3) % createdProducts.length];
      await prisma.wishlistItem
        .upsert({
          where: {
            wishlistId_productId: { wishlistId: wl.id, productId: p.id },
          },
          update: {},
          create: { wishlistId: wl.id, productId: p.id },
        })
        .catch(() => null);
    }

    // Active cart with 2 items
    const existingCart = await prisma.cart.findFirst({
      where: { userId: demoCustomerUser.id, status: CartStatus.ACTIVE },
    });
    let cartId = existingCart?.id;
    if (!cartId) {
      const cart = await prisma.cart.create({
        data: { userId: demoCustomerUser.id, status: CartStatus.ACTIVE },
      });
      cartId = cart.id;
    }
    const cartProducts = [createdProducts[1], createdProducts[3]];
    for (const p of cartProducts) {
      await prisma.cartItem
        .upsert({
          where: {
            cartId_productId_variantId: {
              cartId,
              productId: p.id,
              variantId: null as any, // unique tuple — Prisma encodes null
            },
          },
          update: {},
          create: {
            cartId,
            productId: p.id,
            quantity: 1,
            unitPrice: p.price,
          },
        })
        .catch(() => null);
    }
  }

  // ---------- Notifications spread ----------
  // A handful for demo accounts so dashboards aren't empty.
  if (demoCustomerUser) {
    await prisma.notification.createMany({
      data: [
        {
          userId: demoCustomerUser.id,
          type: NotificationType.ORDER_DELIVERED,
          title: "Your order was delivered",
          message: "Hope you love your new gear! Leave a review to help others.",
          actionUrl: "/account/orders",
        },
        {
          userId: demoCustomerUser.id,
          type: NotificationType.PROMO,
          title: "Use code NEXORA10 for 10% off",
          message: "Save on any order over $50.",
          actionUrl: "/shop",
        },
      ],
      skipDuplicates: true,
    });
  }

  // Demo seller notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: demoShopSeller.userId,
        type: NotificationType.NEW_SELLER_ORDER,
        title: "New orders this week",
        message: "You have multiple new orders waiting to be packed.",
        actionUrl: "/seller/orders",
      },
      {
        userId: demoShopSeller.userId,
        type: NotificationType.LOW_STOCK,
        title: "Low stock alert",
        message: "Some of your products are running low.",
        actionUrl: "/seller/products?filter=low-stock",
      },
    ],
    skipDuplicates: true,
  });

  console.log(
    `[demo] seeded ${createdProducts.length} products, ${createdOrders.length} orders, ${customers.length} extra customers`
  );
};
