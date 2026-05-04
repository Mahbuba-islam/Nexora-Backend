/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import Stripe from "stripe";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { envVars } from "../../config/env";
import {
  NotificationType,
  PayoutMethod,
  PayoutStatus,
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

const findSeller = async (userId: string) => {
  const seller = await prisma.seller.findUnique({ where: { userId } });
  if (!seller) throw new AppError(status.FORBIDDEN, "Not a seller");
  return seller;
};

/**
 * Create or refresh a Stripe Express account onboarding link.
 * Returns a single-use URL the seller should be redirected to.
 */
const createOnboardingLink = async (
  userId: string,
  payload: { returnUrl?: string; refreshUrl?: string }
) => {
  const s = requireStripe();
  const seller = await findSeller(userId);

  let stripeAccountId = seller.stripeAccountId;
  if (!stripeAccountId) {
    const account = await s.accounts.create({
      type: "express",
      email: seller.contactEmail ?? undefined,
      country: seller.bankCountry ?? seller.country ?? "US",
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      business_profile: {
        name: seller.shopName,
        url: seller.websiteUrl ?? undefined,
      },
      metadata: {
        sellerId: seller.id,
        userId,
      },
    });
    stripeAccountId = account.id;
    await prisma.seller.update({
      where: { id: seller.id },
      data: { stripeAccountId, payoutMethod: PayoutMethod.STRIPE_CONNECT },
    });
  }

  const frontend = envVars.FRONTEND_URL || "http://localhost:3000";
  const link = await s.accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    return_url: payload.returnUrl ?? `${frontend}/seller/payouts?stripe=connected`,
    refresh_url: payload.refreshUrl ?? `${frontend}/seller/payouts?stripe=refresh`,
  });

  return {
    url: link.url,
    expiresAt: new Date(link.expires_at * 1000).toISOString(),
    stripeAccountId,
  };
};

/**
 * Pull the latest account state from Stripe and update DB.
 * Used after the seller returns from the onboarding flow.
 */
const refreshStatus = async (userId: string) => {
  const s = requireStripe();
  const seller = await findSeller(userId);
  if (!seller.stripeAccountId) {
    return {
      stripeAccountId: null,
      onboardingDone: false,
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
    };
  }
  const account = await s.accounts.retrieve(seller.stripeAccountId);
  const onboardingDone =
    !!account.details_submitted &&
    !!account.charges_enabled &&
    !!account.payouts_enabled;

  await prisma.seller.update({
    where: { id: seller.id },
    data: {
      stripeOnboardingDone: onboardingDone,
      payoutMethod: onboardingDone
        ? PayoutMethod.STRIPE_CONNECT
        : seller.payoutMethod,
    },
  });

  return {
    stripeAccountId: seller.stripeAccountId,
    onboardingDone,
    detailsSubmitted: !!account.details_submitted,
    chargesEnabled: !!account.charges_enabled,
    payoutsEnabled: !!account.payouts_enabled,
    requirements: account.requirements ?? null,
  };
};

/**
 * Create a Stripe login link to the Express dashboard for the seller.
 */
const createLoginLink = async (userId: string) => {
  const s = requireStripe();
  const seller = await findSeller(userId);
  if (!seller.stripeAccountId) {
    throw new AppError(status.BAD_REQUEST, "Stripe Connect not started yet");
  }
  const link = await s.accounts.createLoginLink(seller.stripeAccountId);
  return { url: link.url };
};

/**
 * Push a pending payout to the connected account via Stripe transfers.
 * Returns the updated payout row.
 */
const transferPayout = async (payoutId: string) => {
  const s = requireStripe();
  const payout = await prisma.sellerPayout.findUnique({
    where: { id: payoutId },
    include: { seller: true },
  });
  if (!payout) throw new AppError(status.NOT_FOUND, "Payout not found");
  if (payout.status === PayoutStatus.PAID) {
    throw new AppError(status.BAD_REQUEST, "Already paid");
  }
  if (!payout.seller.stripeAccountId || !payout.seller.stripeOnboardingDone) {
    throw new AppError(
      status.BAD_REQUEST,
      "Seller has not completed Stripe Connect onboarding"
    );
  }

  const amountCents = Math.round(toNumber(payout.netAmount) * 100);
  let transfer: Stripe.Transfer;
  try {
    transfer = await s.transfers.create({
      amount: amountCents,
      currency: payout.currency.toLowerCase(),
      destination: payout.seller.stripeAccountId,
      metadata: {
        payoutId: payout.id,
        sellerId: payout.sellerId,
      },
    });
  } catch (err: any) {
    await prisma.sellerPayout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.FAILED,
        failureReason: err?.message ?? "Stripe transfer failed",
      },
    });
    throw new AppError(
      status.BAD_GATEWAY,
      `Stripe transfer failed: ${err?.message ?? "unknown"}`
    );
  }

  const updated = await prisma.sellerPayout.update({
    where: { id: payoutId },
    data: {
      status: PayoutStatus.PAID,
      paidAt: new Date(),
      stripeTransferId: transfer.id,
      method: PayoutMethod.STRIPE_CONNECT,
    },
  });

  await notificationService
    .createNotification({
      userId: payout.seller.userId,
      type: NotificationType.PAYOUT_PAID,
      title: "Payout sent via Stripe",
      message: `${payout.currency} ${toNumber(payout.netAmount).toFixed(2)} transferred to your connected Stripe account.`,
      actionUrl: "/seller/payouts",
      metadata: { payoutId },
    })
    .catch(() => null);

  return updated;
};

/**
 * Webhook hook — invoked when Stripe fires `account.updated`.
 */
const onAccountUpdated = async (account: Stripe.Account) => {
  if (!account.id) return;
  const seller = await prisma.seller.findUnique({
    where: { stripeAccountId: account.id },
  });
  if (!seller) return;
  const onboardingDone =
    !!account.details_submitted &&
    !!account.charges_enabled &&
    !!account.payouts_enabled;
  await prisma.seller.update({
    where: { id: seller.id },
    data: { stripeOnboardingDone: onboardingDone },
  });
};

export const stripeConnectService = {
  createOnboardingLink,
  refreshStatus,
  createLoginLink,
  transferPayout,
  onAccountUpdated,
};
