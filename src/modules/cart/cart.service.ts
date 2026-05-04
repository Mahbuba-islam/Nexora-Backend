/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { CartStatus } from "../../generated/enums";
import { toNumber } from "../../utilis/stringUtils";
import { couponService } from "../coupon/coupon.service";

const cartInclude = {
  items: {
    include: {
      product: { include: { images: { orderBy: { sortOrder: "asc" as const } } } },
      variant: true,
    },
  },
};

const summarize = async (cartId: string) => {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: cartInclude,
  });
  if (!cart) throw new AppError(status.NOT_FOUND, "Cart not found");

  const subtotal = cart.items.reduce(
    (sum, item) => sum + toNumber(item.unitPrice) * item.quantity,
    0
  );

  let discount = 0;
  let couponPreview = null;
  if (cart.couponCode && subtotal > 0) {
    try {
      couponPreview = await couponService.validateCoupon(cart.couponCode, subtotal);
      discount = couponPreview.discountAmount;
    } catch {
      couponPreview = null;
    }
  }

  return {
    cart,
    summary: {
      itemCount: cart.items.reduce((s, i) => s + i.quantity, 0),
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
      coupon: couponPreview,
    },
  };
};

const findOrCreateCart = async ({
  userId,
  sessionToken,
}: {
  userId?: string;
  sessionToken?: string;
}) => {
  if (userId) {
    let cart = await prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
    });
    if (!cart) cart = await prisma.cart.create({ data: { userId } });
    return cart;
  }
  if (sessionToken) {
    let cart = await prisma.cart.findUnique({ where: { sessionToken } });
    if (!cart) cart = await prisma.cart.create({ data: { sessionToken } });
    return cart;
  }
  throw new AppError(status.BAD_REQUEST, "userId or sessionToken required");
};

const getCart = async (args: { userId?: string; sessionToken?: string }) => {
  const cart = await findOrCreateCart(args);
  return summarize(cart.id);
};

const addItem = async (
  args: { userId?: string; sessionToken?: string },
  payload: { productId: string; variantId?: string; quantity?: number }
) => {
  const cart = await findOrCreateCart(args);
  const quantity = Math.max(1, payload.quantity ?? 1);

  const product = await prisma.product.findFirst({
    where: { id: payload.productId, isDeleted: false },
  });
  if (!product) throw new AppError(status.NOT_FOUND, "Product not found");

  let unitPrice = toNumber(product.price);
  if (payload.variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: payload.variantId, productId: product.id, isActive: true },
    });
    if (!variant) throw new AppError(status.NOT_FOUND, "Variant not found");
    unitPrice = toNumber(variant.price);
  }

  await prisma.cartItem.upsert({
    where: {
      cartId_productId_variantId: {
        cartId: cart.id,
        productId: payload.productId,
        variantId: (payload.variantId ?? null) as string,
      },
    },
    create: {
      cartId: cart.id,
      productId: payload.productId,
      variantId: payload.variantId ?? null,
      quantity,
      unitPrice,
    },
    update: { quantity: { increment: quantity }, unitPrice },
  });

  return summarize(cart.id);
};

const updateItem = async (
  args: { userId?: string; sessionToken?: string },
  itemId: string,
  payload: { quantity: number }
) => {
  const cart = await findOrCreateCart(args);
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });
  if (!item) throw new AppError(status.NOT_FOUND, "Cart item not found");

  if (payload.quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: payload.quantity },
    });
  }
  return summarize(cart.id);
};

const removeItem = async (
  args: { userId?: string; sessionToken?: string },
  itemId: string
) => {
  const cart = await findOrCreateCart(args);
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  return summarize(cart.id);
};

const clearCart = async (args: { userId?: string; sessionToken?: string }) => {
  const cart = await findOrCreateCart(args);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponCode: null },
  });
  return summarize(cart.id);
};

const applyCoupon = async (
  args: { userId?: string; sessionToken?: string },
  code: string
) => {
  const cart = await findOrCreateCart(args);
  const summary = await summarize(cart.id);
  if (summary.summary.subtotal <= 0) {
    throw new AppError(status.BAD_REQUEST, "Cart is empty");
  }
  await couponService.validateCoupon(code, summary.summary.subtotal);
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponCode: code.toUpperCase() },
  });
  return summarize(cart.id);
};

const removeCoupon = async (args: { userId?: string; sessionToken?: string }) => {
  const cart = await findOrCreateCart(args);
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  return summarize(cart.id);
};

export const cartService = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  findOrCreateCart,
  summarize,
};
