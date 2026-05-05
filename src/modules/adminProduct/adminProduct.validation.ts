import { z } from "zod";
import {
  ProductCondition,
  ProductStatus,
} from "../../generated/enums";

export const updateAdminProductSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(200).optional(),
      shortDesc: z.string().max(500).optional(),
      description: z.string().optional(),
      price: z.number().nonnegative().optional(),
      compareAtPrice: z.number().nonnegative().nullable().optional(),
      costPerItem: z.number().nonnegative().nullable().optional(),
      currency: z.string().length(3).optional(),
      stock: z.number().int().nonnegative().optional(),
      lowStockAlert: z.number().int().nonnegative().optional(),
      trackInventory: z.boolean().optional(),
      allowBackorder: z.boolean().optional(),
      weightGrams: z.number().nonnegative().optional(),
      status: z.nativeEnum(ProductStatus).optional(),
      condition: z.nativeEnum(ProductCondition).optional(),
      isFeatured: z.boolean().optional(),
      isBestseller: z.boolean().optional(),
      isNewArrival: z.boolean().optional(),
      isOnSale: z.boolean().optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      brandId: z.string().uuid().nullable().optional(),
      categoryId: z.string().uuid().optional(),
    })
    .strict(),
});

export const bulkAdminProductSchema = z.object({
  body: z.object({
    ids: z.array(z.string().uuid()).min(1).max(500),
    action: z.enum([
      "archive",
      "activate",
      "draft",
      "feature",
      "unfeature",
      "bestseller",
      "unbestseller",
      "delete",
      "restore",
    ]),
  }),
});
