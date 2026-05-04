import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../generated/enums";
import { productVariantController } from "./productVariant.controler";
import {
  createVariantSchema,
  updateVariantSchema,
} from "./productVariant.validation";

// mergeParams so :productId from the parent product router is visible.
const router = Router({ mergeParams: true });

router.get("/", productVariantController.list);

router.post(
  "/",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(createVariantSchema),
  productVariantController.create
);

router.patch(
  "/:variantId",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(updateVariantSchema),
  productVariantController.update
);

router.delete(
  "/:variantId",
  checkAuth(Role.ADMIN),
  productVariantController.remove
);

export const productVariantRouter = router;
