import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { optionalAuth } from "../../middleware/optionalAuth";
import { cartController } from "./cart.controler";
import {
  addCartItemSchema,
  applyCouponSchema,
  updateCartItemSchema,
} from "./cart.validation";

const router = Router();

// Cart works for guests AND logged-in users. optionalAuth populates
// req.user when a valid token is sent, otherwise the guest cookie
// `nexora-cart` is used. Never trust the guest cookie if req.user is
// set — that's how shared-cart bugs happen.
router.use(optionalAuth);

router.get("/", cartController.get);
router.post("/items", validateRequest(addCartItemSchema), cartController.addItem);
router.patch(
  "/items/:itemId",
  validateRequest(updateCartItemSchema),
  cartController.updateItem
);
router.delete("/items/:itemId", cartController.removeItem);
router.post("/clear", cartController.clear);
router.post("/coupon", validateRequest(applyCouponSchema), cartController.applyCoupon);
router.delete("/coupon", cartController.removeCoupon);

export const cartRouter = router;
