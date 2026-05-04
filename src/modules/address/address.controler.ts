import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { addressService } from "./address.service";

const list = catchAsync(async (req: Request, res: Response) => {
  const result = await addressService.list(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Addresses fetched",
    data: result,
  });
});
const create = catchAsync(async (req: Request, res: Response) => {
  const result = await addressService.create(req.user.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Address created",
    data: result,
  });
});
const update = catchAsync(async (req: Request, res: Response) => {
  const result = await addressService.update(
    req.user.userId,
    req.params.id as string,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Address updated",
    data: result,
  });
});
const remove = catchAsync(async (req: Request, res: Response) => {
  await addressService.remove(req.user.userId, req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Address deleted",
  });
});

export const addressController = { list, create, update, remove };
