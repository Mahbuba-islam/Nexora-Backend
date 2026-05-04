import { z } from "zod";

export const createAddressSchema = z.object({
  type: z.enum(["SHIPPING", "BILLING", "BOTH"]).optional(),
  isDefault: z.boolean().optional(),
  label: z.string().max(60).optional(),
  fullName: z.string().min(2).max(120),
  phone: z
    .string()
    .min(5, "Phone is too short")
    .max(30, "Phone is too long"),
  line1: z.string().min(2).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  state: z.string().max(120).optional(),
  country: z
    .string()
    .min(2, "Country must be at least 2 characters")
    .max(60),
  postalCode: z.string().min(2).max(20),
});

export const updateAddressSchema = createAddressSchema.partial();
