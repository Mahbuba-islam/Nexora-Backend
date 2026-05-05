import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { adminProductService } from "./adminProduct.service";

const list = catchAsync(async (req, res) => {
  const result = await adminProductService.list(req.query as any);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Products retrieved",
    data: result.data,
    meta: result.meta,
  });
});

const getDetail = catchAsync(async (req, res) => {
  const data = await adminProductService.getDetail(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product detail",
    data,
  });
});

const update = catchAsync(async (req, res) => {
  const data = await adminProductService.update(
    req.params.id as string,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product updated",
    data,
  });
});

const softDelete = catchAsync(async (req, res) => {
  const data = await adminProductService.softDelete(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product moved to trash",
    data,
  });
});

const restore = catchAsync(async (req, res) => {
  const data = await adminProductService.restore(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product restored",
    data,
  });
});

const hardDelete = catchAsync(async (req, res) => {
  const data = await adminProductService.hardDelete(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product permanently deleted",
    data,
  });
});

const bulk = catchAsync(async (req, res) => {
  const data = await adminProductService.bulk(req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Bulk action complete",
    data,
  });
});

export const adminProductController = {
  list,
  getDetail,
  update,
  softDelete,
  restore,
  hardDelete,
  bulk,
};
