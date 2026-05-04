import status from "http-status";

import AppError from "../../errorHelpers/AppError";
import { IcreateAdmin } from "./userTypes";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { Role } from "../../generated/enums";
import { IqueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utilis/queryBuilder";
import { Customer, Prisma } from "../../generated/client";

// ----------------- Create Admin (by existing admin) -----------------
const createAdmin = async (payload: IcreateAdmin) => {
  const existsUser = await prisma.user.findUnique({
    where: { email: payload.admin.email },
  });
  if (existsUser) {
    throw new AppError(status.BAD_REQUEST, "User with this email already exists");
  }

  const userData = await auth.api.signUpEmail({
    body: {
      email: payload.admin.email,
      password: payload.password,
      name: payload.admin.name,
      role: Role.ADMIN,
      needPasswordChange: true,
    },
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const adminData = await tx.admin.create({
        data: { userId: userData.user.id, ...payload.admin },
      });
      return tx.admin.findUnique({
        where: { id: adminData.id },
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
          profilePhoto: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              status: true,
              emailVerified: true,
            },
          },
        },
      });
    });
    return result;
  } catch (error) {
    console.error("createAdmin transaction error", error);
    await prisma.user.delete({ where: { id: userData.user.id } }).catch(() => null);
    throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to create admin profile");
  }
};

// ----------------- List Customers -----------------
const getAllCustomers = async (query: IqueryParams) => {
  const queryBuilder = new QueryBuilder<
    Customer,
    Prisma.CustomerWhereInput,
    Prisma.CustomerInclude
  >(prisma.customer, query, {
    searchableFields: ["fullName", "email", "phone", "user.name", "user.email"],
    filterableFields: ["fullName", "email", "phone", "isDeleted", "userId"],
  });

  return queryBuilder
    .search()
    .filter()
    .where({ isDeleted: false })
    .include({
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          emailVerified: true,
        },
      },
    })
    .paginate()
    .sort()
    .fields()
    .excute();
};

export const userService = {
  createAdmin,
  getAllCustomers,
};
