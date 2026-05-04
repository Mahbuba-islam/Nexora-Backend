import { z } from "zod";

export const createBrandSchema = z.object({
  name: z.string().min(1).max(120),
  logo: z.string().url("Logo must be a valid URL").max(500).optional(),
  website: z.string().url("Website must be a valid URL").max(500).optional(),
  description: z.string().max(2000).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateBrandSchema = createBrandSchema.partial();
