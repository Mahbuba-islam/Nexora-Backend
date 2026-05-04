import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../generated/enums";
import { brandController } from "./brand.controler";
import { createBrandSchema, updateBrandSchema } from "./brand.validation";

const router = Router();
router.get("/", brandController.list);
router.get("/:slug", brandController.getBySlug);
router.post(
  "/",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(createBrandSchema),
  brandController.create
);
router.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(updateBrandSchema),
  brandController.update
);
router.delete("/:id", checkAuth(Role.ADMIN), brandController.remove);

export const brandRouter = router;
