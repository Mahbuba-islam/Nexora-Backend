import { Request, Response } from "express";
import status from "http-status";

import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { notificationService } from "./notification.service";

const list = catchAsync(async (req: Request, res: Response) => {
  const result = await notificationService.listForUser(
    req.user.userId,
    req.query as any
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notifications fetched",
    data: { notifications: result.data, unreadCount: result.unreadCount },
    meta: result.meta,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  await notificationService.markAsRead(req.params.id as string, req.user.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notification marked as read",
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await notificationService.markAllAsRead(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "All notifications marked as read",
    data: { count: result.count },
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  await notificationService.deleteNotification(
    req.params.id as string,
    req.user.userId
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notification deleted",
  });
});

export const notificationController = { list, markAsRead, markAllAsRead, remove };
