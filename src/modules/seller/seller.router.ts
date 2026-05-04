import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../generated/enums";
import { sellerController } from "./seller.controler";
import {
  adminApproveSellerSchema,
  adminRejectSellerSchema,
  adminSuspendSellerSchema,
  applyAsSellerSchema,
  updateMyShopSchema,
} from "./seller.validation";

const router = Router();

/* ----------------- Public storefront ----------------- */
router.get("/shops", sellerController.listPublicShops);
router.get("/shops/:slug", sellerController.getPublicShopBySlug);

/* ----------------- Self-service (any logged-in user) ----------------- */
// Apply as a seller (creates a PENDING Seller row, role stays CUSTOMER until approved)
router.post(
  "/apply",
  checkAuth(Role.CUSTOMER, Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(applyAsSellerSchema),
  sellerController.applyAsSeller
);

// Approved seller endpoints
router.get("/me", checkAuth(Role.SELLER, Role.ADMIN), sellerController.getMySeller);
router.patch(
  "/me",
  checkAuth(Role.SELLER, Role.ADMIN),
  validateRequest(updateMyShopSchema),
  sellerController.updateMyShop
);
router.get(
  "/me/dashboard",
  checkAuth(Role.SELLER, Role.ADMIN),
  sellerController.getMyDashboard
);

/* ----------------- Admin moderation ----------------- */
router.get(
  "/admin",
  checkAuth(Role.ADMIN, Role.STAFF),
  sellerController.adminListSellers
);
router.get(
  "/admin/:id",
  checkAuth(Role.ADMIN, Role.STAFF),
  sellerController.adminGetSeller
);
router.patch(
  "/admin/:id/approve",
  checkAuth(Role.ADMIN),
  validateRequest(adminApproveSellerSchema),
  sellerController.adminApproveSeller
);
router.patch(
  "/admin/:id/reject",
  checkAuth(Role.ADMIN),
  validateRequest(adminRejectSellerSchema),
  sellerController.adminRejectSeller
);
router.patch(
  "/admin/:id/suspend",
  checkAuth(Role.ADMIN),
  validateRequest(adminSuspendSellerSchema),
  sellerController.adminSuspendSeller
);
router.patch(
  "/admin/:id/reinstate",
  checkAuth(Role.ADMIN),
  sellerController.adminReinstateSeller
);

export const sellerRouter = router;
