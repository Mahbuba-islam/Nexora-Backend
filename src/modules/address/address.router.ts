import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../generated/enums";
import { addressController } from "./address.controler";
import {
  createAddressSchema,
  updateAddressSchema,
} from "./address.validation";

const router = Router();
router.use(checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF));
router.get("/", addressController.list);
router.post("/", validateRequest(createAddressSchema), addressController.create);
router.patch(
  "/:id",
  validateRequest(updateAddressSchema),
  addressController.update
);
router.delete("/:id", addressController.remove);

export const addressRouter = router;
