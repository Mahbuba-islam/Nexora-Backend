import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { Role } from "../../generated/enums";
import { PaymentController } from "./payment.controler";

const router = Router();

router.post(
  "/orders/:orderId/intent",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  PaymentController.createPaymentIntent
);

export const PaymentRoutes = router;
