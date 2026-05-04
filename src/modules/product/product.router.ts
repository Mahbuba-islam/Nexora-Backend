import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../generated/enums";
import { productController } from "./product.controler";
import {
  createProductSchema,
  updateProductSchema,
} from "./product.validation";
import { productVariantRouter } from "./productVariant.router";

const router = Router();

// Nested variant routes — placed BEFORE /:slug so it doesn't capture "variants"
router.use("/:productId/variants", productVariantRouter);

router.get("/", productController.list);
router.get("/by-id/:id", productController.getById);
router.get("/:slug", productController.getBySlug);
router.post(
  "/",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(createProductSchema),
  productController.create
);
router.patch(
  "/:id",
  checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF),
  validateRequest(updateProductSchema),
  productController.update
);
router.delete(
  "/:id",
  checkAuth(Role.SELLER, Role.ADMIN),
  productController.remove
);

export const productRouter = router;
