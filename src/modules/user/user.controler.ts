import { Request, Response } from "express";
import status from "http-status";

import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { userService } from "./user.service";

const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.createAdmin(req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Admin created",
    data: result,
  });
});

const getAllCustomers = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getAllCustomers(req.query as any);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Customers fetched",
    data: result.data,
    meta: result.meta,
  });
});

export const userController = {
  createAdmin,
  getAllCustomers,
};
