import { Router } from "express";

import { checkAuth } from "../../middleware/cheackAuth";
import { Role } from "../../generated/enums";
import { userController } from "./user.controler";

const router = Router();

router.post("/admin", checkAuth(Role.ADMIN), userController.createAdmin);
router.get("/customers", checkAuth(Role.ADMIN, Role.STAFF), userController.getAllCustomers);

export const userRouter = router;
