import { Router } from "express";
import { Role } from "../../generated/enums";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { inventoryController, restockSchema } from "./inventory.controler";

const router = Router();

router.use(checkAuth(Role.SELLER, Role.ADMIN, Role.STAFF));

router.get("/low-stock", inventoryController.lowStock);
router.get("/summary", inventoryController.summary);
router.post(
  "/products/:productId/restock",
  validateRequest(restockSchema),
  inventoryController.restock
);

export const inventoryRouter = router;
