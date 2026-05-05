import { Router } from "express";

import { checkAuth } from "../../middleware/cheackAuth";
import { Role } from "../../generated/enums";
import { notificationController } from "./notification.controler";

const router = Router();

router.use(
  checkAuth(Role.CUSTOMER, Role.SELLER, Role.ADMIN, Role.STAFF)
);

router.get("/", notificationController.list);
// Aliases used by various frontends — all return the caller's notifications.
router.get("/my", notificationController.list);
router.get("/me", notificationController.list);
router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.remove);

export const notificationRouter = router;
