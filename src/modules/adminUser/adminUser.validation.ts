import { z } from "zod";
import { Role, UserStatus } from "../../generated/enums";

export const updateAdminUserSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(100).optional(),
      role: z.nativeEnum(Role).optional(),
      status: z.nativeEnum(UserStatus).optional(),
      emailVerified: z.boolean().optional(),
    })
    .strict()
    .refine((v) => Object.keys(v).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const userActionReasonSchema = z.object({
  body: z.object({
    reason: z.string().min(3).max(500),
  }),
});
