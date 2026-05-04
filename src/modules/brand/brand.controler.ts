import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { brandService } from "./brand.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await brandService.createBrand(req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Brand created",
    data: result,
  });
});
const list = catchAsync(async (req: Request, res: Response) => {
  const result = await brandService.listBrands(req.query as any);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Brands fetched",
    data: result,
  });
});
const getBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await brandService.getBrandBySlug(req.params.slug as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Brand fetched",
    data: result,
  });
});
const update = catchAsync(async (req: Request, res: Response) => {
  const result = await brandService.updateBrand(req.params.id as string, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Brand updated",
    data: result,
  });
});
const remove = catchAsync(async (req: Request, res: Response) => {
  await brandService.deleteBrand(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Brand deleted",
  });
});

export const brandController = { create, list, getBySlug, update, remove };
