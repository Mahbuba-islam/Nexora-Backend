import { z } from "zod";

export const updateSellerProductSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(200).optional(),
      shortDesc: z.string().max(500).optional().nullable(),
      description: z.string().min(1).optional(),
      price: z.number().positive().optional(),
      compareAtPrice: z.number().positive().nullable().optional(),
      costPerItem: z.number().nonnegative().nullable().optional(),
      currency: z.string().length(3).optional(),
      stock: z.number().int().nonnegative().optional(),
      lowStockAlert: z.number().int().nonnegative().optional(),
      trackInventory: z.boolean().optional(),
      allowBackorder: z.boolean().optional(),
      weightGrams: z.number().int().nonnegative().optional(),
      widthMm: z.number().int().nonnegative().optional(),
      heightMm: z.number().int().nonnegative().optional(),
      depthMm: z.number().int().nonnegative().optional(),
      status: z.enum(["DRAFT", "ACTIVE", "OUT_OF_STOCK"]).optional(),
      condition: z.enum(["NEW", "REFURBISHED", "OPEN_BOX", "USED"]).optional(),
      isNewArrival: z.boolean().optional(),
      isOnSale: z.boolean().optional(),
      metaTitle: z.string().max(200).optional(),
      metaDescription: z.string().max(500).optional(),
      brandId: z.string().uuid().nullable().optional(),
      categoryId: z.string().uuid().optional(),
    })
    .strict()
    .refine((d) => Object.keys(d).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const bulkSellerProductSchema = z.object({
  body: z.object({
    ids: z
      .array(z.string().uuid("Each id must be a UUID"))
      .min(1, "ids[] cannot be empty")
      .max(500, "Cannot bulk-act on more than 500 products at once"),
    action: z.enum(["activate", "draft", "archive", "delete", "restore"]),
  }),
});
