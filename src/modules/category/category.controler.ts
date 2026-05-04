import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { categoryService } from "./category.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.createCategory(req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Category created",
    data: result,
  });
});

const list = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.listCategories(req.query as any);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Categories fetched",
    data: result,
  });
});

const getBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.getCategoryBySlug(
    req.params.slug as string
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category fetched",
    data: result,
  });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.updateCategory(
    req.params.id as string,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category updated",
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  await categoryService.deleteCategory(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category deleted",
  });
});

const tree = catchAsync(async (_req: Request, res: Response) => {
  const result = await categoryService.getCategoryTree();
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category tree fetched",
    data: result,
  });
});

export const categoryController = { create, list, getBySlug, update, remove, tree };
