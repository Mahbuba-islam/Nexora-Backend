import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../generated/enums";
import { sellerProductController } from "./sellerProduct.controler";
import {
  bulkSellerProductSchema,
  updateSellerProductSchema,
} from "./sellerProduct.validation";

const router = Router();

// Every route is scoped to the authenticated seller. ADMIN/STAFF cannot
// hit these endpoints — they have /admin/products for cross-shop work.
router.use(checkAuth(Role.SELLER));

router.get("/", sellerProductController.list);
router.get("/summary", sellerProductController.summary);
router.post(
  "/bulk",
  validateRequest(bulkSellerProductSchema),
  sellerProductController.bulk
);
router.get("/:id", sellerProductController.getDetail);
router.patch(
  "/:id",
  validateRequest(updateSellerProductSchema),
  sellerProductController.update
);
router.delete("/:id", sellerProductController.remove);
router.post("/:id/restore", sellerProductController.restore);

export const sellerProductRouter = router;
