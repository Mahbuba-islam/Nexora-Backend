/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { Role } from "../../generated/enums";

const listForProduct = async (
  productId: string,
  query: { page?: string; limit?: string; includeHidden?: string }
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));

  const where: any = { productId };
  if (query.includeHidden !== "true") where.isHidden = false;

  const [data, total] = await Promise.all([
    prisma.productQuestion.findMany({
      where,
      orderBy: [{ isAnswered: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true } },
        answers: {
          where: query.includeHidden === "true" ? {} : { isHidden: false },
          orderBy: [{ isOfficial: "desc" }, { createdAt: "asc" }],
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
    }),
    prisma.productQuestion.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const askQuestion = async (
  userId: string,
  productId: string,
  question: string
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isDeleted: true },
  });
  if (!product || product.isDeleted) {
    throw new AppError(status.NOT_FOUND, "Product not found");
  }
  return prisma.productQuestion.create({
    data: { productId, userId, question },
    include: { user: { select: { id: true, name: true } } },
  });
};

const answerQuestion = async (
  userId: string,
  role: Role,
  questionId: string,
  answer: string
) => {
  const q = await prisma.productQuestion.findUnique({
    where: { id: questionId },
    include: { product: { select: { sellerId: true } } },
  });
  if (!q) throw new AppError(status.NOT_FOUND, "Question not found");
  if (q.isHidden) {
    throw new AppError(status.BAD_REQUEST, "Cannot answer a hidden question");
  }

  // "Official" if the answerer is admin/staff, or the seller of the product.
  let isOfficial = role === Role.ADMIN || role === Role.STAFF;
  if (!isOfficial && role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (seller && seller.id === q.product.sellerId) {
      isOfficial = true;
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const ans = await tx.productAnswer.create({
      data: { questionId, userId, answer, isOfficial },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    await tx.productQuestion.update({
      where: { id: questionId },
      data: { isAnswered: true },
    });
    return ans;
  });
  return created;
};

const setQuestionHidden = async (
  questionId: string,
  hide: boolean,
  actor: { userId: string; role: Role }
) => {
  const q = await prisma.productQuestion.findUnique({
    where: { id: questionId },
    include: { product: { select: { sellerId: true } } },
  });
  if (!q) throw new AppError(status.NOT_FOUND, "Question not found");

  if (actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });
    if (!seller || seller.id !== q.product.sellerId) {
      throw new AppError(status.FORBIDDEN, "Not your product");
    }
  }
  return prisma.productQuestion.update({
    where: { id: questionId },
    data: { isHidden: hide },
  });
};

const setAnswerHidden = async (
  answerId: string,
  hide: boolean,
  actor: { userId: string; role: Role }
) => {
  const a = await prisma.productAnswer.findUnique({
    where: { id: answerId },
    include: {
      question: { include: { product: { select: { sellerId: true } } } },
    },
  });
  if (!a) throw new AppError(status.NOT_FOUND, "Answer not found");

  if (actor.role === Role.SELLER) {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });
    if (!seller || seller.id !== a.question.product.sellerId) {
      throw new AppError(status.FORBIDDEN, "Not your product");
    }
  } else if (actor.role === Role.CUSTOMER) {
    if (a.userId !== actor.userId) {
      throw new AppError(status.FORBIDDEN, "Not your answer");
    }
  }

  return prisma.productAnswer.update({
    where: { id: answerId },
    data: { isHidden: hide },
  });
};

export const productQaService = {
  listForProduct,
  askQuestion,
  answerQuestion,
  setQuestionHidden,
  setAnswerHidden,
};
