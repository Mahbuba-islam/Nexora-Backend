import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { productVariantService } from "./productVariant.service";

const list = catchAsync(async (req: Request, res: Response) => {
  const result = await productVariantService.listForProduct(
    req.params.productId as string
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Variants fetched",
    data: result,
  });
});

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await productVariantService.create(
    req.params.productId as string,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Variant created",
    data: result,
  });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const result = await productVariantService.update(
    req.params.productId as string,
    req.params.variantId as string,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Variant updated",
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  await productVariantService.remove(
    req.params.productId as string,
    req.params.variantId as string
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Variant removed",
  });
});

export const productVariantController = { list, create, update, remove };
