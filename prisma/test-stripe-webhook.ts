/* eslint-disable no-console */
/**
 * Nexora — Stripe webhook E2E test
 *
 * Verifies the full webhook → DB transition path WITHOUT requiring the
 * Stripe CLI to be logged in. We construct a real `payment_intent.succeeded`
 * event signed with the configured STRIPE_WEBHOOK_SECRET, POST it to the
 * local webhook endpoint, then assert DB state.
 *
 * Run:
 *   1. In one terminal:  npm run dev
 *   2. In another:       npx tsx prisma/test-stripe-webhook.ts
 */

import "dotenv/config";
import Stripe from "stripe";

import { prisma } from "../src/lib/prisma";
import { envVars } from "../src/config/env";
import {
  CartStatus,
  FulfillmentStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
} from "../src/generated/enums";

const WEBHOOK_URL =
  process.env.WEBHOOK_TEST_URL ?? "http://localhost:5000/api/v1/webhook";
const SECRET = envVars.STRIPE.STRIPE_WEBHOOK_SECRET;
const STRIPE_KEY = envVars.STRIPE.STRIPE_SECRET_KEY;

if (!SECRET || !STRIPE_KEY) {
  console.error("❌ STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required.");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_KEY);

// ---------------------------------------------------------------
// 1. Bootstrap a pending order that the webhook can flip to PAID
// ---------------------------------------------------------------
const seedPendingOrder = async () => {
  // Find or create a test customer User (NOT the admin)
  let user = await prisma.user.findFirst({
    where: { email: "stripe-test@nexora.local" },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: "stripe-test@nexora.local",
        name: "Stripe Test",
        role: Role.CUSTOMER,
        emailVerified: true,
      },
    });
  }

  const product = await prisma.product.findFirst({
    where: { isDeleted: false },
    orderBy: { createdAt: "asc" },
  });
  if (!product) throw new Error("No product in DB. Run `npm run seed` first.");

  const orderNumber = `NX-${new Date().getFullYear()}-T${Math.floor(Math.random() * 1_000_000)}`;
  const subtotal = 100;
  const grandTotal = 108;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: user.id,
      status: OrderStatus.PENDING_PAYMENT,
      fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
      paymentStatus: PaymentStatus.UNPAID,
      currency: "USD",
      subtotal,
      shippingTotal: 0,
      taxTotal: 8,
      discountTotal: 0,
      grandTotal,
      items: {
        create: [
          {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            unitPrice: subtotal,
            quantity: 1,
            lineSubtotal: subtotal,
            lineDiscount: 0,
            lineTotal: subtotal,
          },
        ],
      },
    },
  });

  // Create the matching pending Payment row that the webhook will update
  const intentId = `pi_test_${Date.now()}`;
  await prisma.payment.create({
    data: {
      orderId: order.id,
      method: PaymentMethod.STRIPE,
      status: PaymentStatus.UNPAID,
      currency: "USD",
      amount: grandTotal,
      stripePaymentIntentId: intentId,
    },
  });

  return { order, intentId };
};

// ---------------------------------------------------------------
// 2. Build a signed Stripe event and POST it
// ---------------------------------------------------------------
const fireWebhook = async (
  eventType: "payment_intent.succeeded" | "payment_intent.payment_failed",
  intentId: string,
  orderId: string,
  amountCents: number
) => {
  const intent: Partial<Stripe.PaymentIntent> = {
    id: intentId,
    object: "payment_intent",
    amount: amountCents,
    currency: "usd",
    status: eventType === "payment_intent.succeeded" ? "succeeded" : "requires_payment_method",
    latest_charge: `ch_test_${Date.now()}`,
    metadata: { orderId },
  };

  if (eventType === "payment_intent.payment_failed") {
    (intent as any).last_payment_error = { message: "Test failure" };
  }

  const event = {
    id: `evt_test_${Date.now()}`,
    object: "event",
    type: eventType,
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    data: { object: intent },
  };

  const payload = JSON.stringify(event);
  const signatureHeader = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: SECRET,
  });

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signatureHeader,
    },
    body: payload,
  });

  const text = await res.text();
  return { status: res.status, body: text };
};

// ---------------------------------------------------------------
// 3. Run the scenario
// ---------------------------------------------------------------
const main = async () => {
  console.log("🧪 Nexora Stripe webhook E2E test");
  console.log(`   POST → ${WEBHOOK_URL}\n`);

  // --- Scenario A: payment_intent.succeeded ---
  const { order, intentId } = await seedPendingOrder();
  console.log(`✅ Seeded pending order ${order.orderNumber} (${order.id})`);
  console.log(`   intent: ${intentId}`);

  const okRes = await fireWebhook(
    "payment_intent.succeeded",
    intentId,
    order.id,
    Math.round(Number(order.grandTotal) * 100)
  );
  console.log(`\n[succeeded] HTTP ${okRes.status}: ${okRes.body}`);
  if (okRes.status !== 200) {
    throw new Error("Expected 200 from webhook");
  }

  const paid = await prisma.order.findUnique({
    where: { id: order.id },
    include: { payments: true, history: true },
  });
  if (!paid) throw new Error("Order vanished");

  console.log(`\n📋 Post-webhook state:`);
  console.log(`   order.status        = ${paid.status}`);
  console.log(`   order.paymentStatus = ${paid.paymentStatus}`);
  console.log(`   order.paidAt        = ${paid.paidAt?.toISOString()}`);
  console.log(`   payment.status      = ${paid.payments[0]?.status}`);
  console.log(`   payment.paidAt      = ${paid.payments[0]?.paidAt?.toISOString()}`);
  console.log(`   history entries     = ${paid.history.length}`);

  const okAssertions =
    paid.status === OrderStatus.PAID &&
    paid.paymentStatus === PaymentStatus.PAID &&
    paid.payments[0]?.status === PaymentStatus.PAID &&
    paid.history.some((h) => h.toStatus === OrderStatus.PAID);

  if (!okAssertions) {
    throw new Error("❌ Assertions FAILED for payment_intent.succeeded");
  }
  console.log("✅ Scenario A (succeeded): all assertions PASS\n");

  // --- Scenario B: payment_intent.payment_failed ---
  const { order: failOrder, intentId: failIntentId } = await seedPendingOrder();
  console.log(`✅ Seeded pending order ${failOrder.orderNumber} (${failOrder.id})`);

  const failRes = await fireWebhook(
    "payment_intent.payment_failed",
    failIntentId,
    failOrder.id,
    Math.round(Number(failOrder.grandTotal) * 100)
  );
  console.log(`\n[failed] HTTP ${failRes.status}: ${failRes.body}`);

  const failed = await prisma.order.findUnique({
    where: { id: failOrder.id },
    include: { payments: true },
  });
  if (!failed) throw new Error("Failed order vanished");

  console.log(`\n📋 Post-webhook state:`);
  console.log(`   order.paymentStatus  = ${failed.paymentStatus}`);
  console.log(`   payment.status       = ${failed.payments[0]?.status}`);
  console.log(`   payment.failureReason= ${failed.payments[0]?.failureReason}`);

  const failAssertions =
    failed.paymentStatus === PaymentStatus.FAILED &&
    failed.payments[0]?.status === PaymentStatus.FAILED;

  if (!failAssertions) {
    throw new Error("❌ Assertions FAILED for payment_intent.payment_failed");
  }
  console.log("✅ Scenario B (failed): all assertions PASS\n");

  // --- Scenario C: tampered signature (security check) ---
  const tamperRes = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": "t=1,v1=deadbeef",
    },
    body: JSON.stringify({ type: "payment_intent.succeeded" }),
  });
  console.log(`[tampered] HTTP ${tamperRes.status}`);
  if (tamperRes.status !== 400) {
    throw new Error("Expected 400 for tampered signature");
  }
  console.log("✅ Scenario C (tampered signature): rejected with 400\n");

  // --- Cleanup test orders so re-runs stay fast ---
  await prisma.payment.deleteMany({
    where: { orderId: { in: [order.id, failOrder.id] } },
  });
  await prisma.orderItem.deleteMany({
    where: { orderId: { in: [order.id, failOrder.id] } },
  });
  await prisma.orderStatusHistory.deleteMany({
    where: { orderId: { in: [order.id, failOrder.id] } },
  });
  await prisma.order.deleteMany({
    where: { id: { in: [order.id, failOrder.id] } },
  });
  // Mark cart for those test orders if any
  await prisma.cart.deleteMany({
    where: { orderId: { in: [order.id, failOrder.id] }, status: CartStatus.CONVERTED },
  });

  console.log("🧹 Cleaned up test data");
  console.log("🎉 ALL STRIPE WEBHOOK E2E SCENARIOS PASSED");
};

main()
  .catch((err) => {
    console.error("\n❌ Test failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
