import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../generated/enums";
import { adminProductController } from "./adminProduct.controler";
import {
  bulkAdminProductSchema,
  updateAdminProductSchema,
} from "./adminProduct.validation";

const router = Router();

router.use(checkAuth(Role.ADMIN, Role.STAFF));

router.get("/", adminProductController.list);
router.post(
  "/bulk",
  validateRequest(bulkAdminProductSchema),
  adminProductController.bulk
);
router.get("/:id", adminProductController.getDetail);
router.patch(
  "/:id",
  validateRequest(updateAdminProductSchema),
  adminProductController.update
);
router.delete("/:id", adminProductController.softDelete);
router.post("/:id/restore", adminProductController.restore);
router.delete("/:id/hard", adminProductController.hardDelete);

export const adminProductRouter = router;
