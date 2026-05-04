import { Router } from "express";
import { Role } from "../../generated/enums";
import { checkAuth } from "../../middleware/cheackAuth";
import { stripeConnectController } from "./stripeConnect.controler";

const router = Router();

// Seller self-service
router.post(
  "/sellers/me/onboarding-link",
  checkAuth(Role.SELLER, Role.ADMIN),
  stripeConnectController.createOnboardingLink
);
router.get(
  "/sellers/me/status",
  checkAuth(Role.SELLER, Role.ADMIN),
  stripeConnectController.refreshStatus
);
router.get(
  "/sellers/me/login-link",
  checkAuth(Role.SELLER, Role.ADMIN),
  stripeConnectController.loginLink
);

// Admin-triggered transfer for an existing payout row
router.post(
  "/payouts/:id/transfer",
  checkAuth(Role.ADMIN),
  stripeConnectController.transferPayout
);

export const stripeConnectRouter = router;
