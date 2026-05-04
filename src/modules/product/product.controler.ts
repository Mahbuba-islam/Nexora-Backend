import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { productService } from "./product.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const sellerId = await productService.resolveActorSellerId(
    { userId: req.user.userId, role: req.user.role },
    req.body?.sellerId
  );
  const result = await productService.createProduct({ ...req.body, sellerId });
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Product created",
    data: result,
  });
});

const list = catchAsync(async (req: Request, res: Response) => {
  const result = await productService.listProducts(req.query as any);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Products fetched",
    data: result.data,
    meta: result.meta,
  });
});

const getBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await productService.getProductBySlug(req.params.slug as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product fetched",
    data: result,
  });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const result = await productService.getProductById(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product fetched",
    data: result,
  });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const result = await productService.updateProduct(
    req.params.id as string,
    req.body,
    { userId: req.user.userId, role: req.user.role }
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product updated",
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  await productService.deleteProduct(req.params.id as string, {
    userId: req.user.userId,
    role: req.user.role,
  });
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Product deleted",
  });
});

export const productController = { create, list, getBySlug, getById, update, remove };
