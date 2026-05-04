/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import status from "http-status";
import { z } from "zod";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import { toNumber } from "../../utilis/stringUtils";
import { shippingService } from "./shipping.service";

export const quoteShippingSchema = z.object({
  destination: z.object({
    country: z.string().length(2),
    state: z.string().max(120).optional(),
    city: z.string().max(120).optional(),
    postalCode: z.string().max(20).optional(),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1)
    .optional(),
  cartId: z.string().uuid().optional(),
});

const quote = catchAsync(async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof quoteShippingSchema>;

  // Resolve item bundle: either explicit list or by cartId
  let resolved: any[] = [];
  if (body.items?.length) {
    const productIds = body.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isDeleted: false },
      select: {
        id: true,
        sellerId: true,
        price: true,
        weightGrams: true,
      },
    });
    const variantIds = body.items
      .map((i) => i.variantId)
      .filter((v): v is string => !!v);
    const variants = variantIds.length
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, price: true, productId: true },
        })
      : [];

    resolved = body.items.map((it) => {
      const p = products.find((p) => p.id === it.productId);
      if (!p) throw new AppError(status.BAD_REQUEST, "Unknown product");
      const v = it.variantId
        ? variants.find((v) => v.id === it.variantId)
        : null;
      const unitPrice = toNumber(v?.price ?? p.price);
      return {
        productId: p.id,
        variantId: it.variantId ?? null,
        sellerId: p.sellerId,
        weightGrams: p.weightGrams,
        unitPrice,
        quantity: it.quantity,
        lineSubtotal: unitPrice * it.quantity,
      };
    });
  } else if (body.cartId) {
    const cart = await prisma.cart.findUnique({
      where: { id: body.cartId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, sellerId: true, price: true, weightGrams: true },
            },
            variant: { select: { id: true, price: true } },
          },
        },
      },
    });
    if (!cart) throw new AppError(status.NOT_FOUND, "Cart not found");
    resolved = cart.items.map((it) => {
      const unitPrice = toNumber(it.variant?.price ?? it.product.price);
      return {
        productId: it.productId,
        variantId: it.variantId ?? null,
        sellerId: it.product.sellerId,
        weightGrams: it.product.weightGrams,
        unitPrice,
        quantity: it.quantity,
        lineSubtotal: unitPrice * it.quantity,
      };
    });
  } else {
    throw new AppError(
      status.BAD_REQUEST,
      "Provide either `items` or `cartId`"
    );
  }

  const result = await shippingService.quoteShipping({
    items: resolved,
    destination: body.destination,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Shipping quote",
    data: { ...result, strategy: shippingService.getShippingStrategy().name },
  });
});

export const shippingController = { quote };
