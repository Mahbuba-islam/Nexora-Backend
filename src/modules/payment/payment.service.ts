/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from "stripe";
import status from "http-status";

import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { envVars } from "../../config/env";
import {
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../generated/enums";
import { toNumber } from "../../utilis/stringUtils";
import { notificationService } from "../notification/notification.service";

const stripeKey = envVars.STRIPE.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

const requireStripe = () => {
  if (!stripe) {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      "Stripe is not configured. Set STRIPE_SECRET_KEY."
    );
  }
  return stripe;
};

const createPaymentIntent = async (orderId: string, userId: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });
  if (!order) throw new AppError(status.NOT_FOUND, "Order not found");
  if (order.paymentStatus === PaymentStatus.PAID) {
    throw new AppError(status.BAD_REQUEST, "Order is already paid");
  }

  const s = requireStripe();
  const amountCents = Math.round(toNumber(order.grandTotal) * 100);

  const intent = await s.paymentIntents.create({
    amount: amountCents,
    currency: order.currency.toLowerCase(),
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
    },
    automatic_payment_methods: { enabled: true },
  });

  await prisma.payment.create({
    data: {
      orderId: order.id,
      method: PaymentMethod.STRIPE,
      status: PaymentStatus.UNPAID,
      currency: order.currency,
      amount: order.grandTotal,
      stripePaymentIntentId: intent.id,
    },
  });

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amount: toNumber(order.grandTotal),
    currency: order.currency,
  };
};

const handleStripeWebhookEvent = async (rawBody: Buffer, signature: string) => {
  const s = requireStripe();
  const webhookSecret = envVars.STRIPE.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new AppError(status.SERVICE_UNAVAILABLE, "Webhook secret missing");
  }

  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    throw new AppError(status.BAD_REQUEST, `Webhook error: ${err.message}`);
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (!orderId) break;

      await prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            stripeChargeId: intent.latest_charge as string | null,
            stripeEventId: event.id,
            paymentGatewayData: intent as never,
          },
        });
        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.PAID,
            paidAt: new Date(),
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            toStatus: OrderStatus.PAID,
            note: "Payment succeeded",
          },
        });
      });

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order) {
        await notificationService
          .createNotification({
            userId: order.userId,
            type: NotificationType.ORDER_PAID,
            title: "Payment received",
            message: `Payment for order ${order.orderNumber} was successful.`,
            actionUrl: `/orders/${order.id}`,
            metadata: { orderId: order.id },
          })
          .catch(() => null);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason:
            intent.last_payment_error?.message ?? "Payment failed",
          stripeEventId: event.id,
        },
      });
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: PaymentStatus.FAILED },
        });
      }
      break;
    }
    default:
      break;
  }

  return { received: true, type: event.type };
};

export const paymentService = {
  createPaymentIntent,
  handleStripeWebhookEvent,
};
