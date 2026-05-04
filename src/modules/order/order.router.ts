import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { checkoutLimiter } from "../../middleware/rateLimiter";
import { Role } from "../../generated/enums";
import { orderController } from "./order.controler";
import {
  checkoutSchema,
  updateOrderStatusSchema,
} from "./order.validation";

const router = Router();

router.use(checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF));

router.post(
  "/checkout",
  checkoutLimiter,
  validateRequest(checkoutSchema),
  orderController.checkout
);
router.get("/me", orderController.listMine);
router.post("/:id/cancel", orderController.cancel);
router.get("/:id", orderController.getById);

// Admin only
router.get("/", checkAuth(Role.ADMIN, Role.STAFF), orderController.listAll);
router.patch(
  "/:id/status",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(updateOrderStatusSchema),
  orderController.updateStatus
);

export const orderRouter = router;
