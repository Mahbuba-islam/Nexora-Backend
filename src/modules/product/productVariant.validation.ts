import { z } from "zod";

const attributeValue = z.union([z.string(), z.number(), z.boolean()]);

export const createVariantSchema = z.object({
  sku: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  attributes: z.record(z.string(), attributeValue),
  price: z.number().positive("Price must be greater than 0"),
  compareAtPrice: z.number().positive().nullable().optional(),
  stock: z.number().int().nonnegative().optional(),
  image: z.string().url().max(800).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateVariantSchema = createVariantSchema.partial();
