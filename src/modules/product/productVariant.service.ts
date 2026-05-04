/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";

export interface IVariantPayload {
  sku: string;
  name: string;
  attributes: Record<string, string | number | boolean>;
  price: number;
  compareAtPrice?: number | null;
  stock?: number;
  image?: string | null;
  isActive?: boolean;
}

const ensureProductExists = async (productId: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, isDeleted: false },
    select: { id: true },
  });
  if (!product) throw new AppError(status.NOT_FOUND, "Product not found");
};

const listForProduct = async (productId: string) => {
  await ensureProductExists(productId);
  return prisma.productVariant.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
  });
};

const create = async (productId: string, payload: IVariantPayload) => {
  await ensureProductExists(productId);

  const skuClash = await prisma.productVariant.findUnique({
    where: { sku: payload.sku },
  });
  if (skuClash) {
    throw new AppError(status.CONFLICT, `SKU ${payload.sku} already exists`);
  }

  return prisma.productVariant.create({
    data: {
      productId,
      sku: payload.sku,
      name: payload.name,
      attributes: payload.attributes as any,
      price: payload.price,
      compareAtPrice: payload.compareAtPrice ?? null,
      stock: payload.stock ?? 0,
      image: payload.image ?? null,
      isActive: payload.isActive ?? true,
    },
  });
};

const update = async (
  productId: string,
  variantId: string,
  payload: Partial<IVariantPayload>
) => {
  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
  });
  if (!existing) throw new AppError(status.NOT_FOUND, "Variant not found");

  if (payload.sku && payload.sku !== existing.sku) {
    const clash = await prisma.productVariant.findUnique({
      where: { sku: payload.sku },
    });
    if (clash) {
      throw new AppError(status.CONFLICT, `SKU ${payload.sku} already exists`);
    }
  }

  const data: any = {};
  if (payload.sku !== undefined) data.sku = payload.sku;
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.attributes !== undefined) data.attributes = payload.attributes;
  if (payload.price !== undefined) data.price = payload.price;
  if (payload.compareAtPrice !== undefined) data.compareAtPrice = payload.compareAtPrice;
  if (payload.stock !== undefined) data.stock = payload.stock;
  if (payload.image !== undefined) data.image = payload.image;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;

  return prisma.productVariant.update({ where: { id: variantId }, data });
};

const remove = async (productId: string, variantId: string) => {
  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
  });
  if (!existing) throw new AppError(status.NOT_FOUND, "Variant not found");

  // Hard-delete is unsafe if the variant is referenced by orders or live carts.
  // Deactivate instead — preserves order history.
  const linked = await prisma.orderItem.count({
    where: { variantId },
  });
  if (linked > 0) {
    return prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });
  }
  await prisma.cartItem.deleteMany({ where: { variantId } });
  return prisma.productVariant.delete({ where: { id: variantId } });
};

export const productVariantService = {
  listForProduct,
  create,
  update,
  remove,
};
