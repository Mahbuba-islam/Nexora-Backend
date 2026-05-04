import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  icon: z.string().max(255).optional(),
  image: z.string().url("Image must be a valid URL").max(500).optional(),
  parentId: z.string().uuid("parentId must be a UUID").nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
