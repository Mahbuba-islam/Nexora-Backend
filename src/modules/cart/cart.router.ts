import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { cartController } from "./cart.controler";
import {
  addCartItemSchema,
  applyCouponSchema,
  updateCartItemSchema,
} from "./cart.validation";

const router = Router();

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
