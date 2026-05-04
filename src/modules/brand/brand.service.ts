import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { slugify } from "../../utilis/stringUtils";

export interface ICreateBrand {
  name: string;
  logo?: string;
  website?: string;
  description?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}

const ensureUniqueSlug = async (base: string, ignoreId?: string) => {
  let slug = base || "brand";
  let i = 1;
  while (true) {
    const exists = await prisma.brand.findUnique({ where: { slug } });
    if (!exists || exists.id === ignoreId) return slug;
    slug = `${base}-${++i}`;
  }
};

const createBrand = async (payload: ICreateBrand) => {
  const slug = await ensureUniqueSlug(slugify(payload.name));
  return prisma.brand.create({
    data: {
      name: payload.name,
      slug,
      logo: payload.logo ?? null,
      website: payload.website ?? null,
      description: payload.description ?? null,
      isFeatured: payload.isFeatured ?? false,
      isActive: payload.isActive ?? true,
    },
  });
};

const listBrands = async (query: { search?: string; isFeatured?: string }) => {
  const where: any = { isDeleted: false, isActive: true };
  if (query.search) where.name = { contains: query.search, mode: "insensitive" };
  if (query.isFeatured === "true") where.isFeatured = true;
  return prisma.brand.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
};

const getBrandBySlug = async (slug: string) => {
  const brand = await prisma.brand.findFirst({
    where: { slug, isDeleted: false },
  });
  if (!brand) throw new AppError(status.NOT_FOUND, "Brand not found");
  return brand;
};

const updateBrand = async (id: string, payload: Partial<ICreateBrand>) => {
  const existing = await prisma.brand.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError(status.NOT_FOUND, "Brand not found");
  const data: any = {};
  if (payload.name !== undefined) {
    data.name = payload.name;
    data.slug = await ensureUniqueSlug(slugify(payload.name), id);
  }
  for (const k of ["logo", "website", "description", "isFeatured", "isActive"] as const) {
    if (payload[k] !== undefined) data[k] = payload[k];
  }
  return prisma.brand.update({ where: { id }, data });
};

const deleteBrand = async (id: string) => {
  return prisma.brand.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isActive: false },
  });
};

export const brandService = {
  createBrand,
  listBrands,
  getBrandBySlug,
  updateBrand,
  deleteBrand,
};
