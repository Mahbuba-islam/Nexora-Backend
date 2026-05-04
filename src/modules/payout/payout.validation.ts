import { z } from "zod";

export const generatePayoutSchema = z.object({
  sellerId: z.string().uuid(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  method: z.enum(["STRIPE_CONNECT", "MANUAL_BANK"]).optional(),
});

export const markPayoutPaidSchema = z.object({
  bankReference: z.string().max(120).optional(),
  stripeTransferId: z.string().max(120).optional(),
});

export const markPayoutFailedSchema = z.object({
  failureReason: z.string().min(1).max(500),
});

export type IGeneratePayout = z.infer<typeof generatePayoutSchema>;
export type IMarkPayoutPaid = z.infer<typeof markPayoutPaidSchema>;
export type IMarkPayoutFailed = z.infer<typeof markPayoutFailedSchema>;
