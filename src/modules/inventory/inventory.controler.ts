import { Request, Response } from "express";
import { z } from "zod";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { inventoryService } from "./inventory.service";

export const restockSchema = z.object({
  stock: z.number().int().positive(),
  variantId: z.string().uuid().optional(),
});

const lowStock = catchAsync(async (req: Request, res: Response) => {
  const result = await inventoryService.listLowStock(
    { userId: req.user.userId, role: req.user.role },
    req.query
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Low-stock products fetched",
    data: result.data,
    meta: result.meta,
  });
});

const restock = catchAsync(async (req: Request, res: Response) => {
  const result = await inventoryService.restockProduct(
    req.params.productId as string,
    { userId: req.user.userId, role: req.user.role },
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Stock updated",
    data: result,
  });
});

const summary = catchAsync(async (req: Request, res: Response) => {
  const result = await inventoryService.summary({
    userId: req.user.userId,
    role: req.user.role,
  });
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Inventory summary",
    data: result,
  });
});

export const inventoryController = { lowStock, restock, summary };
