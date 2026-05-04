import { z } from "zod";

export const RefundReasonEnum = z.enum([
  "DAMAGED",
  "DEFECTIVE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NO_LONGER_NEEDED",
  "LATE_DELIVERY",
  "OTHER",
]);

export const requestRefundSchema = z.object({
  orderId: z.string().uuid(),
  sellerOrderId: z.string().uuid().optional(),
  reason: RefundReasonEnum,
  customerNote: z.string().max(2000).optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export const decideRefundSchema = z.object({
  approvedAmount: z.number().nonnegative().optional(),
  decisionNote: z.string().max(2000).optional(),
});

export type IRequestRefund = z.infer<typeof requestRefundSchema>;
export type IDecideRefund = z.infer<typeof decideRefundSchema>;
