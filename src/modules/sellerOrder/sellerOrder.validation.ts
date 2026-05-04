import { z } from "zod";

export const updateSellerOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
    "RETURN_REQUESTED",
    "RETURNED",
  ]),
  note: z.string().max(1000).optional(),
});

export const addTrackingSchema = z.object({
  courier: z.string().min(1).max(100),
  trackingNumber: z.string().min(1).max(100),
  trackingUrl: z.string().url().max(500).optional(),
});

export const cancelSellerOrderSchema = z.object({
  reason: z.string().min(1).max(500),
});

export type IUpdateSellerOrderStatus = z.infer<
  typeof updateSellerOrderStatusSchema
>;
export type IAddTracking = z.infer<typeof addTrackingSchema>;
export type ICancelSellerOrder = z.infer<typeof cancelSellerOrderSchema>;
