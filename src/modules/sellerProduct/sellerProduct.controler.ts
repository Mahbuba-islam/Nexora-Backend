import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { sellerProductService } from "./sellerProduct.service";

const list = catchAsync(async (req, res) => {
  const result = await sellerProductService.list(req.user.userId, req.query as any);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Products retrieved",
    data: result.data,
    meta: result.meta,
  });
});

const summary = catchAsync(async (req, res) => {
  const result = await sellerProductService.summary(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product summary retrieved",
    data: result,
  });
});

const getDetail = catchAsync(async (req, res) => {
  const result = await sellerProductService.getDetail(
    req.user.userId,
    req.params.id
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product retrieved",
    data: result,
  });
});

const update = catchAsync(async (req, res) => {
  const result = await sellerProductService.update(
    req.user.userId,
    req.params.id,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product updated",
    data: result,
  });
});

const remove = catchAsync(async (req, res) => {
  const result = await sellerProductService.softDelete(
    req.user.userId,
    req.params.id
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product deleted",
    data: result,
  });
});

const restore = catchAsync(async (req, res) => {
  const result = await sellerProductService.restore(
    req.user.userId,
    req.params.id
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product restored",
    data: result,
  });
});

const bulk = catchAsync(async (req, res) => {
  const result = await sellerProductService.bulk(req.user.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Bulk action complete",
    data: result,
  });
});

export const sellerProductController = {
  list,
  summary,
  getDetail,
  update,
  remove,
  restore,
  bulk,
};
