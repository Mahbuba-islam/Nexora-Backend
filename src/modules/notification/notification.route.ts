import { Router } from "express";

import { checkAuth } from "../../middleware/cheackAuth";
import { Role } from "../../generated/enums";
import { notificationController } from "./notification.controler";

const router = Router();

router.use(checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF));

router.get("/", notificationController.list);
router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.remove);

export const notificationRouter = router;
