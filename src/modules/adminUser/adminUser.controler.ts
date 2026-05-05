import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { adminUserService } from "./adminUser.service";

const list = catchAsync(async (req, res) => {
  const result = await adminUserService.list(req.query as any);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Users retrieved",
    data: result.data,
    meta: result.meta,
  });
});

const getDetail = catchAsync(async (req, res) => {
  const data = await adminUserService.getDetail(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User detail",
    data,
  });
});

const update = catchAsync(async (req, res) => {
  const data = await adminUserService.update(
    req.params.id as string,
    req.body,
    req.user.userId
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User updated",
    data,
  });
});

const suspend = catchAsync(async (req, res) => {
  const data = await adminUserService.suspend(
    req.params.id as string,
    req.body.reason,
    req.user.userId
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User suspended",
    data,
  });
});

const block = catchAsync(async (req, res) => {
  const data = await adminUserService.block(
    req.params.id as string,
    req.body.reason,
    req.user.userId
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User blocked",
    data,
  });
});

const reactivate = catchAsync(async (req, res) => {
  const data = await adminUserService.reactivate(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User reactivated",
    data,
  });
});

const softDelete = catchAsync(async (req, res) => {
  const data = await adminUserService.softDelete(
    req.params.id as string,
    req.user.userId
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User deleted",
    data,
  });
});

const restore = catchAsync(async (req, res) => {
  const data = await adminUserService.restore(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User restored",
    data,
  });
});

const getOrders = catchAsync(async (req, res) => {
  const result = await adminUserService.getOrders(
    req.params.id as string,
    req.query as any
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User orders",
    data: result.data,
    meta: result.meta,
  });
});

export const adminUserController = {
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
