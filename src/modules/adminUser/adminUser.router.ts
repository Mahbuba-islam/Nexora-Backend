import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../generated/enums";
import { adminUserController } from "./adminUser.controler";
import {
  updateAdminUserSchema,
  userActionReasonSchema,
} from "./adminUser.validation";

const router = Router();

router.use(checkAuth(Role.ADMIN, Role.STAFF));

router.get("/", adminUserController.list);
router.get("/:id", adminUserController.getDetail);
router.get("/:id/orders", adminUserController.getOrders);

router.patch(
  "/:id",
  checkAuth(Role.ADMIN), // role/status changes restricted to ADMIN
  validateRequest(updateAdminUserSchema),
  adminUserController.update
);

router.post(
  "/:id/suspend",
  checkAuth(Role.ADMIN),
  validateRequest(userActionReasonSchema),
  adminUserController.suspend
);
router.post(
  "/:id/block",
  checkAuth(Role.ADMIN),
  validateRequest(userActionReasonSchema),
  adminUserController.block
);
router.post(
  "/:id/reactivate",
  checkAuth(Role.ADMIN),
  adminUserController.reactivate
);
router.delete(
  "/:id",
  checkAuth(Role.ADMIN),
  adminUserController.softDelete
);
router.post(
  "/:id/restore",
  checkAuth(Role.ADMIN),
  adminUserController.restore
);

export const adminUserRouter = router;
