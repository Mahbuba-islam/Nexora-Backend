/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ReviewStatus } from "../../generated/enums";

export interface ICreateReview {
  productId: string;
  orderItemId?: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: { url: string }[];
}

const recomputeProductAggregates = async (productId: string) => {
  const aggr = await prisma.review.aggregate({
    where: { productId, status: ReviewStatus.APPROVED },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      avgRating: aggr._avg.rating ?? null,
      reviewCount: aggr._count._all,
    },
  });
};

const create = async (userId: string, payload: ICreateReview) => {
  if (payload.rating < 1 || payload.rating > 5) {
    throw new AppError(status.BAD_REQUEST, "Rating must be between 1 and 5");
  }
  if (payload.orderItemId) {
    const item = await prisma.orderItem.findFirst({
      where: {
        id: payload.orderItemId,
        productId: payload.productId,
        order: { userId },
      },
    });
    if (!item) {
      throw new AppError(
        status.BAD_REQUEST,
        "Order item not found or doesn't belong to user"
      );
    }
  }

  const review = await prisma.review.create({
    data: {
      productId: payload.productId,
      userId,
      orderItemId: payload.orderItemId ?? null,
      rating: payload.rating,
      title: payload.title,
      comment: payload.comment,
      status: payload.orderItemId ? ReviewStatus.APPROVED : ReviewStatus.PENDING,
      images: payload.images?.length
        ? { create: payload.images }
        : undefined,
    },
    include: { images: true },
  });

  if (review.status === ReviewStatus.APPROVED) {
    await recomputeProductAggregates(payload.productId);
  }
  return review;
};

const listForProduct = async (
  productId: string,
  query: { page?: string; limit?: string }
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where = { productId, status: ReviewStatus.APPROVED };
  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        images: true,
        user: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const moderate = async (id: string, status_: ReviewStatus) => {
  const review = await prisma.review.update({
    where: { id },
    data: { status: status_ },
  });
  await recomputeProductAggregates(review.productId);
  return review;
};

const remove = async (userId: string, id: string, isAdmin = false) => {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new AppError(status.NOT_FOUND, "Review not found");
  if (!isAdmin && review.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "Cannot delete another user's review");
  }
  await prisma.review.delete({ where: { id } });
  await recomputeProductAggregates(review.productId);
};

export const reviewService = { create, listForProduct, moderate, remove };
