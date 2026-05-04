import { z } from "zod";

export const addCartItemSchema = z.object({
  productId: z.string().uuid("productId must be a UUID"),
  variantId: z.string().uuid("variantId must be a UUID").optional(),
  quantity: z.number().int().min(1).max(999).optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(999),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(60),
});
