import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";

const getOrCreate = async (userId: string) => {
  const existing = await prisma.wishlist.findUnique({ where: { userId } });
  if (!existing) {
    await prisma.wishlist.create({ data: { userId } });
  }
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { images: { orderBy: { sortOrder: "asc" } } },
          },
        },
        orderBy: { addedAt: "desc" },
      },
    },
  });
  if (!wishlist) throw new AppError(status.INTERNAL_SERVER_ERROR, "Wishlist creation failed");
  return wishlist;
};

const addItem = async (userId: string, productId: string) => {
  const wishlist = await getOrCreate(userId);
  const product = await prisma.product.findFirst({
    where: { id: productId, isDeleted: false },
  });
  if (!product) throw new AppError(status.NOT_FOUND, "Product not found");

  await prisma.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    create: { wishlistId: wishlist.id, productId },
    update: {},
  });
  return getOrCreate(userId);
};

const removeItem = async (userId: string, productId: string) => {
  const wishlist = await getOrCreate(userId);
  await prisma.wishlistItem.deleteMany({
    where: { wishlistId: wishlist.id, productId },
  });
  return getOrCreate(userId);
};

export const wishlistService = { getOrCreate, addItem, removeItem };
