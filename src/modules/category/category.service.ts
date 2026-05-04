import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { slugify } from "../../utilis/stringUtils";

export interface ICreateCategory {
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  parentId?: string | null;
  sortOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
}

const ensureUniqueSlug = async (base: string, ignoreId?: string) => {
  let slug = base || "category";
  let i = 1;
  while (true) {
    const exists = await prisma.category.findUnique({ where: { slug } });
    if (!exists || exists.id === ignoreId) return slug;
    slug = `${base}-${++i}`;
  }
};

const createCategory = async (payload: ICreateCategory) => {
  const slug = await ensureUniqueSlug(slugify(payload.name));
  return prisma.category.create({
    data: {
      name: payload.name,
      slug,
      description: payload.description ?? null,
      icon: payload.icon ?? null,
      image: payload.image ?? null,
      parentId: payload.parentId ?? null,
      sortOrder: payload.sortOrder ?? 0,
      isFeatured: payload.isFeatured ?? false,
      isActive: payload.isActive ?? true,
    },
  });
};

const listCategories = async (query: {
  search?: string;
  parentId?: string;
  isFeatured?: string;
  rootOnly?: string;
}) => {
  const where: any = { isDeleted: false, isActive: true };
  if (query.search) where.name = { contains: query.search, mode: "insensitive" };
  if (query.rootOnly === "true") where.parentId = null;
  else if (query.parentId) where.parentId = query.parentId;
  if (query.isFeatured === "true") where.isFeatured = true;

  return prisma.category.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { children: true, _count: { select: { products: true } } },
  });
};

const getCategoryBySlug = async (slug: string) => {
  const category = await prisma.category.findFirst({
    where: { slug, isDeleted: false },
    include: { children: true, parent: true },
  });
  if (!category) throw new AppError(status.NOT_FOUND, "Category not found");
  return category;
};

const updateCategory = async (id: string, payload: Partial<ICreateCategory>) => {
  const existing = await prisma.category.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existing) throw new AppError(status.NOT_FOUND, "Category not found");

  const data: any = {};
  if (payload.name !== undefined) {
    data.name = payload.name;
    data.slug = await ensureUniqueSlug(slugify(payload.name), id);
  }
  for (const k of [
    "description",
    "icon",
    "image",
    "parentId",
    "sortOrder",
    "isFeatured",
    "isActive",
  ] as const) {
    if (payload[k] !== undefined) data[k] = payload[k];
  }

  return prisma.category.update({ where: { id }, data });
};

const deleteCategory = async (id: string) => {
  return prisma.category.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isActive: false },
  });
};

/**
 * Build a 2-level (root + children) tree of all active categories.
 * Used by the storefront top navigation / mega-menu.
 */
const getCategoryTree = async () => {
  const roots = await prisma.category.findMany({
    where: { parentId: null, isDeleted: false, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      children: {
        where: { isDeleted: false, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { products: true } } },
      },
      _count: { select: { products: true } },
    },
  });
  return roots;
};

export const categoryService = {
  createCategory,
  listCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  getCategoryTree,
};
