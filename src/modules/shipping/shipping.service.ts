/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Pluggable shipping cost engine.
 *
 * The marketplace can swap strategies without touching checkout.
 * `defaultStrategy` is a flat-rate / free-over-threshold strategy that
 * mirrors the legacy behaviour in `marketplacePricing.calculateSellerShipping`.
 *
 * Strategies are pure: they receive the request payload and return an
 * array of quoted services (one per shipping speed). The cheapest is
 * usually presented as default in the UI.
 */
import { round2 } from "../../utilis/stringUtils";

export interface ShippingItem {
  productId: string;
  variantId?: string | null;
  sellerId: string;
  weightGrams?: number | null;
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
}

export interface ShippingDestination {
  country: string;
  state?: string | null;
  city?: string | null;
  postalCode?: string | null;
}

export interface ShippingQuoteRequest {
  items: ShippingItem[];
  destination: ShippingDestination;
  currency?: string;
}

export interface ShippingService {
  code: string;
  label: string;
  cost: number;
  currency: string;
  etaDays: { min: number; max: number };
}

export interface ShippingSellerQuote {
  sellerId: string;
  subtotal: number;
  weightGrams: number;
  services: ShippingService[];
}

export interface ShippingQuote {
  perSeller: ShippingSellerQuote[];
  cheapestTotal: number;
  currency: string;
}

export interface ShippingStrategy {
  name: string;
  quote(req: ShippingQuoteRequest): Promise<ShippingQuote> | ShippingQuote;
}

const FREE_SHIPPING_THRESHOLD = 50;
const STANDARD_BASE = 5;
const EXPRESS_BASE = 15;
// Per-kg overweight surcharge above first 1000 g.
const PER_KG = 1.5;

const groupBySeller = (items: ShippingItem[]) => {
  const map = new Map<string, ShippingItem[]>();
  for (const it of items) {
    const arr = map.get(it.sellerId) ?? [];
    arr.push(it);
    map.set(it.sellerId, arr);
  }
  return map;
};

/**
 * Default flat-rate strategy with a free-shipping threshold and a small
 * weight surcharge. Domestic vs international price tier inferred from
 * the destination country (for demo purposes "US" is domestic).
 */
export const defaultStrategy: ShippingStrategy = {
  name: "flat-rate-v1",
  quote(req) {
    const currency = req.currency ?? "USD";
    const groups = groupBySeller(req.items);
    const isInternational =
      (req.destination.country ?? "US").toUpperCase() !== "US";

    const perSeller: ShippingSellerQuote[] = [];
    for (const [sellerId, items] of groups) {
      const subtotal = round2(items.reduce((s, i) => s + i.lineSubtotal, 0));
      const weight = items.reduce(
        (s, i) => s + (i.weightGrams ?? 0) * i.quantity,
        0
      );
      const overweightKg = Math.max(0, (weight - 1000) / 1000);
      const weightSurcharge = round2(overweightKg * PER_KG);
      const intlMultiplier = isInternational ? 2 : 1;

      const standard = round2(
        subtotal >= FREE_SHIPPING_THRESHOLD && !isInternational
          ? 0
          : (STANDARD_BASE + weightSurcharge) * intlMultiplier
      );
      const express = round2(
        (EXPRESS_BASE + weightSurcharge) * intlMultiplier
      );

      perSeller.push({
        sellerId,
        subtotal,
        weightGrams: weight,
        services: [
          {
            code: "STANDARD",
            label: "Standard shipping",
            cost: standard,
            currency,
            etaDays: isInternational
              ? { min: 7, max: 14 }
              : { min: 3, max: 5 },
          },
          {
            code: "EXPRESS",
            label: "Express shipping",
            cost: express,
            currency,
            etaDays: isInternational
              ? { min: 3, max: 6 }
              : { min: 1, max: 2 },
          },
        ],
      });
    }

    const cheapestTotal = round2(
      perSeller.reduce(
        (s, g) =>
          s + Math.min(...g.services.map((svc) => svc.cost)),
        0
      )
    );

    return { perSeller, cheapestTotal, currency };
  },
};

let activeStrategy: ShippingStrategy = defaultStrategy;

export const setShippingStrategy = (s: ShippingStrategy) => {
  activeStrategy = s;
};

export const getShippingStrategy = () => activeStrategy;

export const quoteShipping = async (
  req: ShippingQuoteRequest
): Promise<ShippingQuote> => {
  return activeStrategy.quote(req);
};

export const shippingService = {
  quoteShipping,
  getShippingStrategy,
  setShippingStrategy,
};
