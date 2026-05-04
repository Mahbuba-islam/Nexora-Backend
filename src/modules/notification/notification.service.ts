import { prisma } from "../../lib/prisma";
import { NotificationType } from "../../generated/enums";

export interface ICreateNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

const createNotification = async (payload: ICreateNotificationPayload) => {
  return prisma.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      actionUrl: payload.actionUrl,
      metadata: payload.metadata as never,
    },
  });
};

const createNotificationsForUsers = async (
  userIds: string[],
  base: Omit<ICreateNotificationPayload, "userId">
) => {
  if (userIds.length === 0) return { count: 0 };
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: base.type,
      title: base.title,
      message: base.message,
      actionUrl: base.actionUrl,
      metadata: base.metadata as never,
    })),
  });
};

const listForUser = async (
  userId: string,
  query: { page?: string; limit?: string; unreadOnly?: string }
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(query.unreadOnly === "true" ? { isRead: false } : {}),
  };

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    unreadCount,
  };
};

const markAsRead = async (id: string, userId: string) => {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true, readAt: new Date() },
  });
};

const markAllAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
};

const deleteNotification = async (id: string, userId: string) => {
  return prisma.notification.deleteMany({ where: { id, userId } });
};

export const notificationService = {
  createNotification,
  createNotificationsForUsers,
  listForUser,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
