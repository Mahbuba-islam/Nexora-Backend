import { z } from "zod";

const imageInput = z.object({
  url: z.string().url("Image URL must be a valid URL").max(800),
  alt: z.string().max(200).optional(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const specInput = z.object({
  group: z.string().max(80).optional(),
  label: z.string().min(1).max(120),
  value: z.string().min(1).max(400),
  sortOrder: z.number().int().min(0).optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  sku: z.string().min(1).max(80),
  shortDesc: z.string().max(500).optional(),
  description: z.string().min(1),
  price: z.number().positive("Price must be greater than 0"),
  compareAtPrice: z.number().positive().optional(),
  costPerItem: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  stock: z.number().int().nonnegative().optional(),
  lowStockAlert: z.number().int().nonnegative().optional(),
  trackInventory: z.boolean().optional(),
  allowBackorder: z.boolean().optional(),
  weightGrams: z.number().int().nonnegative().optional(),
  widthMm: z.number().int().nonnegative().optional(),
  heightMm: z.number().int().nonnegative().optional(),
  depthMm: z.number().int().nonnegative().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "OUT_OF_STOCK"]).optional(),
  condition: z.enum(["NEW", "REFURBISHED", "OPEN_BOX", "USED"]).optional(),
  isFeatured: z.boolean().optional(),
  isBestseller: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isOnSale: z.boolean().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  brandId: z.string().uuid("brandId must be a UUID").nullable().optional(),
  categoryId: z.string().uuid("categoryId must be a UUID"),
  // Optional in payload — sellers ignore this (resolved from session);
  // admins/staff may pass it to create on behalf of a seller.
  sellerId: z.string().uuid("sellerId must be a UUID").optional(),
  images: z.array(imageInput).optional(),
  specifications: z.array(specInput).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateProductSchema = createProductSchema.partial();
