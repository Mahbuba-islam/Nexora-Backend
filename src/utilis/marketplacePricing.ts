/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Multi-vendor pricing helpers.
 *
 * Centralises commission, shipping, tax and discount allocation logic so
 * that order checkout, payout accrual, and admin recalculations all
 * agree on the numbers.
 */
import { round2 } from "./stringUtils";

/** Default platform commission, %, used when the seller has no override. */
export const DEFAULT_COMMISSION_RATE = 10; // %

/** Tax rate (flat for now — real impl would use TaxRule per region). */
export const DEFAULT_TAX_RATE = 0.08;

/** Per-seller free-shipping threshold (in order currency). */
export const FREE_SHIPPING_THRESHOLD = 50;

/** Per-seller flat shipping fees. */
export const STANDARD_SHIPPING = 5;
export const EXPRESS_SHIPPING = 15;

export type ShippingMethod = "standard" | "express";

export const calculateSellerShipping = (
  subtotal: number,
  method: ShippingMethod = "standard"
): number => {
  if (method === "express") return EXPRESS_SHIPPING;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
};

export const calculateTax = (taxableAmount: number): number =>
  round2(taxableAmount * DEFAULT_TAX_RATE);

/**
 * Allocate a single discount across N seller groups proportionally
 * to each group's subtotal. The last group absorbs any rounding
 * remainder so the sum still equals `totalDiscount`.
 */
export const allocateDiscount = (
  groupSubtotals: number[],
  totalDiscount: number
): number[] => {
  if (totalDiscount <= 0 || groupSubtotals.length === 0) {
    return groupSubtotals.map(() => 0);
  }
  const grandTotal = groupSubtotals.reduce((s, x) => s + x, 0);
  if (grandTotal <= 0) {
    return groupSubtotals.map(() => 0);
  }

  const allocations = groupSubtotals.map((sub) =>
    round2((sub / grandTotal) * totalDiscount)
  );
  // Reconcile rounding drift onto the last non-zero bucket.
  const allocated = allocations.reduce((s, x) => s + x, 0);
  const drift = round2(totalDiscount - allocated);
  if (drift !== 0) {
    for (let i = allocations.length - 1; i >= 0; i--) {
      if (allocations[i] > 0 || drift > 0) {
        allocations[i] = round2(allocations[i] + drift);
        break;
      }
    }
  }
  return allocations;
};

export interface SellerCommissionResult {
  commissionRate: number;
  commissionAmount: number;
  payoutAmount: number;
}

export const calculateCommission = (
  sellerSubtotalAfterDiscount: number,
  rateOverride?: number | null
): SellerCommissionResult => {
  const rate =
    rateOverride != null && rateOverride >= 0 && rateOverride <= 100
      ? rateOverride
      : DEFAULT_COMMISSION_RATE;
  const commissionAmount = round2((sellerSubtotalAfterDiscount * rate) / 100);
  const payoutAmount = round2(sellerSubtotalAfterDiscount - commissionAmount);
  return { commissionRate: rate, commissionAmount, payoutAmount };
};
