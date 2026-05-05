import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { sellerService } from "./seller.service";

/* ---------- Public ---------- */
const listPublicShops = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.listPublicShops(req.query as Record<string, unknown>);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Shops fetched",
    data: result.data,
    meta: result.meta,
  });
});

const getPublicShopBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.getPublicShopBySlug(req.params.slug as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Shop fetched",
    data: result,
  });
});

/* ---------- Self-service ---------- */
const applyAsSeller = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.applyAsSeller(req.user.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Seller application submitted",
    data: result,
  });
});

const getMySeller = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.getMySeller(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller profile fetched",
    data: result,
  });
});

const updateMyShop = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.updateMyShop(req.user.userId, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Shop updated",
    data: result,
  });
});

const getMyDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.getMyDashboard(req.user.userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Dashboard fetched",
    data: result,
  });
});

/* ---------- Admin ---------- */
const adminListSellers = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.adminListSellers(req.query as Record<string, unknown>);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Sellers fetched",
    data: result.data,
    meta: result.meta,
  });
});

const adminGetSeller = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.adminGetSeller(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller fetched",
    data: result,
  });
});

const adminApproveSeller = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.adminApproveSeller(
    req.params.id as string,
    req.user.userId,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller approved",
    data: result,
  });
});

const adminRejectSeller = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.adminRejectSeller(
    req.params.id as string,
    req.user.userId,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller application rejected",
    data: result,
  });
});

const adminSuspendSeller = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.adminSuspendSeller(
    req.params.id as string,
    req.user.userId,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller suspended",
    data: result,
  });
});

const adminReinstateSeller = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.adminReinstateSeller(
    req.params.id as string,
    req.user.userId
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller reinstated",
    data: result,
  });
});

const adminGetSellerDetail = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.adminGetSellerDetail(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller detail",
    data: result,
  });
});

const adminUpdateSeller = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.adminUpdateSeller(
    req.params.id as string,
    req.body
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller updated",
    data: result,
  });
});

const adminSoftDeleteSeller = catchAsync(async (req: Request, res: Response) => {
  const result = await sellerService.adminSoftDeleteSeller(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller deleted",
    data: result,
  });
});

export const sellerController = {
  listPublicShops,
  getPublicShopBySlug,
  applyAsSeller,
  getMySeller,
  updateMyShop,
  getMyDashboard,
  adminListSellers,
  adminGetSeller,
  adminGetSellerDetail,
  adminUpdateSeller,
  adminSoftDeleteSeller,
  adminApproveSeller,
  adminRejectSeller,
  adminSuspendSeller,
  adminReinstateSeller,
};
