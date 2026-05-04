import { z } from "zod";

export const createReviewSchema = z.object({
  productId: z.string().uuid("productId must be a UUID"),
  orderItemId: z.string().uuid("orderItemId must be a UUID").optional(),
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  title: z.string().max(200).optional(),
  comment: z.string().max(4000).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url("Image URL must be valid").max(800),
      })
    )
    .max(8, "Maximum 8 images per review")
    .optional(),
});

export const moderateReviewSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED"]),
});
