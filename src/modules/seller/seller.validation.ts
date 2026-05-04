import { z } from "zod";

/**
 * Seller / marketplace input validation.
 * Mirrors the patterns used elsewhere in the codebase (body-only schemas
 * passed through `validateRequest`).
 */

const optionalUrl = z.string().url().max(500).optional();
const country2 = z
  .string()
  .length(2, "Country must be ISO-3166 alpha-2 (e.g. US, BD)")
  .toUpperCase();

/* ---------- Public application (anyone with a User account) ---------- */
export const applyAsSellerSchema = z.object({
  shopName: z.string().min(2).max(120),
  tagline: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  logo: optionalUrl,
  banner: optionalUrl,

  contactEmail: z.string().email().max(160),
  contactPhone: z.string().max(40).optional(),
  websiteUrl: optionalUrl,

  legalName: z.string().max(200).optional(),
  businessType: z
    .enum(["INDIVIDUAL", "COMPANY", "LLC", "PARTNERSHIP", "OTHER"])
    .optional(),
  taxId: z.string().max(80).optional(),
  registrationNo: z.string().max(120).optional(),

  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  country: country2.optional(),
  postalCode: z.string().max(20).optional(),

  returnPolicy: z.string().max(10000).optional(),
  shippingPolicy: z.string().max(10000).optional(),

  // Payout intent
  payoutMethod: z.enum(["STRIPE_CONNECT", "MANUAL_BANK"]).optional(),
  bankAccountHolderName: z.string().max(200).optional(),
  bankAccountNumber: z.string().max(80).optional(),
  bankRoutingNumber: z.string().max(80).optional(),
  bankName: z.string().max(200).optional(),
  bankCountry: country2.optional(),
});

/* ---------- Self-service shop edit (approved seller) ---------- */
export const updateMyShopSchema = applyAsSellerSchema.partial().extend({
  // shopName changes invalidate cached shop URLs — keep but allow.
  shopName: z.string().min(2).max(120).optional(),
});

/* ---------- Admin: approve / reject / suspend ---------- */
export const adminApproveSellerSchema = z.object({
  commissionRate: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Platform commission %. Falls back to platform default."),
  note: z.string().max(2000).optional(),
});

export const adminRejectSellerSchema = z.object({
  reason: z.string().min(3).max(2000),
});

export const adminSuspendSellerSchema = z.object({
  reason: z.string().min(3).max(2000),
});

/* ---------- Param schemas (used with validateRequest wrapper form) ---------- */
export const sellerIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("seller id must be a UUID"),
  }),
});

export const shopSlugParamSchema = z.object({
  params: z.object({
    slug: z
      .string()
      .min(1)
      .max(140)
      .regex(/^[a-z0-9-]+$/, "Invalid shop slug"),
  }),
});

export type IApplyAsSeller = z.infer<typeof applyAsSellerSchema>;
export type IUpdateMyShop = z.infer<typeof updateMyShopSchema>;
export type IAdminApproveSeller = z.infer<typeof adminApproveSellerSchema>;
export type IAdminRejectSeller = z.infer<typeof adminRejectSellerSchema>;
export type IAdminSuspendSeller = z.infer<typeof adminSuspendSellerSchema>;
