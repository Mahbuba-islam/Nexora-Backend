import { Router } from "express";
import { Role } from "../../generated/enums";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { sellerOrderController } from "./sellerOrder.controler";
import {
  addTrackingSchema,
  cancelSellerOrderSchema,
  updateSellerOrderStatusSchema,
} from "./sellerOrder.validation";

const router = Router();

// Seller-scoped
router.get(
  "/me",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  sellerOrderController.listMine
);

// Admin-scoped
router.get(
  "/admin",
  checkAuth(Role.ADMIN, Role.STAFF),
  sellerOrderController.listAll
);

router.get(
  "/:id",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  sellerOrderController.getById
);

router.patch(
  "/:id/status",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(updateSellerOrderStatusSchema),
  sellerOrderController.updateStatus
);

router.patch(
  "/:id/tracking",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(addTrackingSchema),
  sellerOrderController.addTracking
);

router.patch(
  "/:id/cancel",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(cancelSellerOrderSchema),
  sellerOrderController.cancel
);

export const sellerOrderRouter = router;
