/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { AddressType } from "../../generated/enums";

export interface ICreateAddress {
  type?: AddressType;
  isDefault?: boolean;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
}

const list = async (userId: string) =>
  prisma.address.findMany({
    where: { userId, isDeleted: false },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

const create = async (userId: string, payload: ICreateAddress) => {
  return prisma.$transaction(async (tx) => {
    if (payload.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDeleted: false },
        data: { isDefault: false },
      });
    }
    return tx.address.create({
      data: {
        userId,
        type: payload.type ?? AddressType.SHIPPING,
        isDefault: payload.isDefault ?? false,
        label: payload.label,
        fullName: payload.fullName,
        phone: payload.phone,
        line1: payload.line1,
        line2: payload.line2,
        city: payload.city,
        state: payload.state,
        country: payload.country.toUpperCase(),
        postalCode: payload.postalCode,
      },
    });
  });
};

const update = async (
  userId: string,
  id: string,
  payload: Partial<ICreateAddress>
) => {
  const existing = await prisma.address.findFirst({
    where: { id, userId, isDeleted: false },
  });
  if (!existing) throw new AppError(status.NOT_FOUND, "Address not found");

  return prisma.$transaction(async (tx) => {
    if (payload.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDeleted: false, NOT: { id } },
        data: { isDefault: false },
      });
    }
    const data: any = { ...payload };
    if (payload.country) data.country = payload.country.toUpperCase();
    return tx.address.update({ where: { id }, data });
  });
};

const remove = async (userId: string, id: string) => {
  const existing = await prisma.address.findFirst({
    where: { id, userId, isDeleted: false },
  });
  if (!existing) throw new AppError(status.NOT_FOUND, "Address not found");
  return prisma.address.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
};

export const addressService = { list, create, update, remove };
