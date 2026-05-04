import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../generated/enums";
import { wishlistController } from "./wishlist.controler";
import { addWishlistItemSchema } from "./wishlist.validation";

const router = Router();
router.use(checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF));
router.get("/", wishlistController.get);
router.post(
  "/items",
  validateRequest(addWishlistItemSchema),
  wishlistController.addItem
);
router.delete("/items/:productId", wishlistController.removeItem);

export const wishlistRouter = router;
