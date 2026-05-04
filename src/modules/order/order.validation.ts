import { z } from "zod";

export const checkoutSchema = z.object({
  shippingAddressId: z.string().uuid("shippingAddressId must be a UUID"),
  billingAddressId: z.string().uuid("billingAddressId must be a UUID").optional(),
  couponCode: z.string().min(1).max(60).optional(),
  customerNote: z.string().max(2000).optional(),
  shippingMethod: z.enum(["standard", "express"]).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
    "RETURN_REQUESTED",
    "RETURNED",
    "FAILED",
  ]),
  note: z.string().max(1000).optional(),
});
