import { Router } from "express";
import { Role } from "../../generated/enums";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { refundController } from "./refund.controler";
import {
  decideRefundSchema,
  requestRefundSchema,
} from "./refund.validation";

const router = Router();

// Customer
router.post(
  "/",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  validateRequest(requestRefundSchema),
  refundController.request
);
router.get(
  "/me",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  refundController.listMine
);

// Seller
router.get(
  "/seller",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  refundController.listSeller
);

// Admin
router.get(
  "/admin",
  checkAuth(Role.ADMIN, Role.STAFF),
  refundController.listAll
);

// Shared by id (visibility checked in service)
router.get(
  "/:id",
  checkAuth(Role.CUSTOMER, Role.SELLER, Role.ADMIN, Role.STAFF),
  refundController.getById
);

router.patch(
  "/:id/approve",
  checkAuth(Role.SELLER, Role.ADMIN),
  validateRequest(decideRefundSchema),
  refundController.approve
);
router.patch(
  "/:id/reject",
  checkAuth(Role.SELLER, Role.ADMIN),
  validateRequest(decideRefundSchema),
  refundController.reject
);
router.post(
  "/:id/process",
  checkAuth(Role.ADMIN),
  refundController.reprocess
);

export const refundRouter = router;
