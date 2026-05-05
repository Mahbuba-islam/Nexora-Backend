/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin user management service.
 *
 * Powers the admin "Users" page. Lists all roles, lets admins:
 *   - search/filter
 *   - view a user's full profile + lifetime stats
 *   - block/suspend/reactivate
 *   - change role (CUSTOMER ↔ STAFF — admin promotion is a separate flow)
 *   - soft-delete / restore
 *
 * Self-protection: an admin cannot apply destructive actions to their own
 * account or to the last remaining admin.
 */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  NotificationType,
  PaymentStatus,
  Role,
  UserStatus,
} from "../../generated/enums";
import { toNumber } from "../../utilis/stringUtils";

interface ListQuery {
  search?: string;
  role?: Role | "ALL";
  status?: UserStatus | "ALL";
  isDeleted?: "true" | "false" | "all";
  emailVerified?: "true" | "false";
  sortBy?: "createdAt" | "updatedAt" | "name" | "email";
  sortOrder?: "asc" | "desc";
  page?: string;
  limit?: string;
}

const list = async (q: ListQuery) => {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (q.role && q.role !== "ALL") where.role = q.role;
  if (q.status && q.status !== "ALL") where.status = q.status;
  if (q.isDeleted === "true") where.isDeleted = true;
  else if (q.isDeleted === "false") where.isDeleted = false;
  if (q.emailVerified === "true") where.emailVerified = true;
  if (q.emailVerified === "false") where.emailVerified = false;
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: "insensitive" } },
      { email: { contains: q.search, mode: "insensitive" } },
    ];
  }

  const sortBy = q.sortBy ?? "createdAt";
  const sortOrder = q.sortOrder ?? "desc";

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        isDeleted: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
            addresses: true,
          },
        },
        seller: {
          select: { id: true, shopName: true, shopSlug: true, status: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getDetail = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
      isDeleted: true,
      deletedAt: true,
      image: true,
      createdAt: true,
      updatedAt: true,
      customer: true,
      seller: {
        select: {
          id: true,
          shopName: true,
          shopSlug: true,
          status: true,
          totalSales: true,
          orderCount: true,
          productCount: true,
        },
      },
      admin: {
        select: { id: true, name: true, email: true, contactNumber: true },
      },
      addresses: { take: 5, orderBy: { createdAt: "desc" } },
      _count: {
        select: {
          orders: true,
          reviews: true,
          addresses: true,
          notifications: true,
          refundsRequested: true,
        },
      },
    },
  });
  if (!user) throw new AppError(status.NOT_FOUND, "User not found");

  // Lifetime spend (paid orders only)
  const paid = await prisma.order.findMany({
    where: { userId: id, paymentStatus: PaymentStatus.PAID },
    select: { grandTotal: true },
  });
  const lifetimeSpend = paid.reduce((s, o) => s + toNumber(o.grandTotal), 0);

  const lastOrder = await prisma.order.findFirst({
    where: { userId: id },
    orderBy: { placedAt: "desc" },
    select: { id: true, orderNumber: true, status: true, grandTotal: true, placedAt: true },
  });

  const lastSession = await prisma.session.findFirst({
    where: { userId: id },
    orderBy: { updatedAt: "desc" },
    select: { ipAddress: true, userAgent: true, updatedAt: true, expiresAt: true },
  });

  return {
    ...user,
    stats: {
      lifetimeSpend: Math.round(lifetimeSpend * 100) / 100,
      paidOrderCount: paid.length,
      lastOrder,
      lastSession,
    },
  };
};

const ensureNotSelf = (targetUserId: string, actorUserId: string) => {
  if (targetUserId === actorUserId) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot perform this action on your own account"
    );
  }
};

const ensureNotLastAdmin = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (user?.role !== Role.ADMIN) return;
  const remaining = await prisma.user.count({
    where: {
      role: Role.ADMIN,
      isDeleted: false,
      status: UserStatus.ACTIVE,
      id: { not: id },
    },
  });
  if (remaining === 0) {
    throw new AppError(
      status.CONFLICT,
      "Cannot modify the last active admin account"
    );
  }
};

interface UpdateUserPayload {
  name?: string;
  role?: Role;
  status?: UserStatus;
  emailVerified?: boolean;
}

const update = async (
  id: string,
  payload: UpdateUserPayload,
  actorUserId: string
) => {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new AppError(status.NOT_FOUND, "User not found");

  if (
    payload.role !== undefined &&
    payload.role !== target.role
  ) {
    ensureNotSelf(id, actorUserId);
    await ensureNotLastAdmin(id);
    // Promoting to ADMIN via this endpoint is intentionally blocked —
    // use the admin creation flow instead so an Admin row gets seeded.
    if (payload.role === Role.ADMIN) {
      throw new AppError(
        status.FORBIDDEN,
        "Use the admin creation endpoint to promote a user to ADMIN"
      );
    }
  }
  if (
    payload.status !== undefined &&
    payload.status !== target.status &&
    target.role === Role.ADMIN
  ) {
    ensureNotSelf(id, actorUserId);
    await ensureNotLastAdmin(id);
  }

  const data: any = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.role !== undefined) data.role = payload.role;
  if (payload.status !== undefined) data.status = payload.status;
  if (payload.emailVerified !== undefined) data.emailVerified = payload.emailVerified;

  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
    },
  });
};

const suspend = async (id: string, reason: string, actorUserId: string) => {
  ensureNotSelf(id, actorUserId);
  await ensureNotLastAdmin(id);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new AppError(status.NOT_FOUND, "User not found");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED },
    });
    // Force-revoke active sessions
    await tx.session.deleteMany({ where: { userId: id } });
    // Audit-style notification (optional — keeps user informed)
    await tx.notification
      .create({
        data: {
          userId: id,
          type: NotificationType.SYSTEM,
          title: "Account suspended",
          message: reason,
        },
      })
      .catch(() => null);
  });
  return { id, status: UserStatus.SUSPENDED, reason };
};

const block = async (id: string, reason: string, actorUserId: string) => {
  ensureNotSelf(id, actorUserId);
  await ensureNotLastAdmin(id);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new AppError(status.NOT_FOUND, "User not found");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { status: UserStatus.BLOCKED },
    });
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.notification
      .create({
        data: {
          userId: id,
          type: NotificationType.SYSTEM,
          title: "Account blocked",
          message: reason,
        },
      })
      .catch(() => null);
  });
  return { id, status: UserStatus.BLOCKED, reason };
};

const reactivate = async (id: string) => {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new AppError(status.NOT_FOUND, "User not found");
  if (target.isDeleted) {
    throw new AppError(
      status.CONFLICT,
      "User is soft-deleted. Restore first."
    );
  }
  return prisma.user.update({
    where: { id },
    data: { status: UserStatus.ACTIVE },
    select: { id: true, status: true },
  });
};

const softDelete = async (id: string, actorUserId: string) => {
  ensureNotSelf(id, actorUserId);
  await ensureNotLastAdmin(id);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new AppError(status.NOT_FOUND, "User not found");
  if (target.isDeleted) {
    throw new AppError(status.CONFLICT, "User is already deleted");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });
    await tx.session.deleteMany({ where: { userId: id } });
    // Cascade soft-deletes to role-specific profiles
    if (target.role === Role.CUSTOMER) {
      await tx.customer.updateMany({
        where: { userId: id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    } else if (target.role === Role.SELLER) {
      await tx.seller.updateMany({
        where: { userId: id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    } else if (target.role === Role.ADMIN) {
      await tx.admin.updateMany({
        where: { userId: id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    }
  });
  return { id, deleted: true };
};

const restore = async (id: string) => {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new AppError(status.NOT_FOUND, "User not found");
  if (!target.isDeleted) {
    throw new AppError(status.CONFLICT, "User is not deleted");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        status: UserStatus.ACTIVE,
      },
    });
    if (target.role === Role.CUSTOMER) {
      await tx.customer.updateMany({
        where: { userId: id },
        data: { isDeleted: false, deletedAt: null },
      });
    } else if (target.role === Role.SELLER) {
      await tx.seller.updateMany({
        where: { userId: id },
        data: { isDeleted: false, deletedAt: null },
      });
    } else if (target.role === Role.ADMIN) {
      await tx.admin.updateMany({
        where: { userId: id },
        data: { isDeleted: false, deletedAt: null },
      });
    }
  });
  return { id, restored: true };
};

const getOrders = async (id: string, q: { page?: string; limit?: string }) => {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(q.limit) || 10));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: id },
      orderBy: { placedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        grandTotal: true,
        currency: true,
        placedAt: true,
        deliveredAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where: { userId: id } }),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const adminUserService = {
  list,
  getDetail,
  update,
  suspend,
  block,
  reactivate,
  softDelete,
  restore,
  getOrders,
};
