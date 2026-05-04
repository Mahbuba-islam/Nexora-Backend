import { Router } from "express";
import { Role } from "../../generated/enums";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { payoutController } from "./payout.controler";
import {
  generatePayoutSchema,
  markPayoutFailedSchema,
  markPayoutPaidSchema,
} from "./payout.validation";

const router = Router();

// Seller-scoped
router.get(
  "/me",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  payoutController.listMine
);

// Admin-scoped
router.get(
  "/admin",
  checkAuth(Role.ADMIN, Role.STAFF),
  payoutController.listAll
);

router.get(
  "/:id",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  payoutController.getById
);

router.post(
  "/admin/generate",
  checkAuth(Role.ADMIN),
  validateRequest(generatePayoutSchema),
  payoutController.generate
);

router.patch(
  "/admin/:id/paid",
  checkAuth(Role.ADMIN),
  validateRequest(markPayoutPaidSchema),
  payoutController.markPaid
);

router.patch(
  "/admin/:id/failed",
  checkAuth(Role.ADMIN),
  validateRequest(markPayoutFailedSchema),
  payoutController.markFailed
);

export const payoutRouter = router;
