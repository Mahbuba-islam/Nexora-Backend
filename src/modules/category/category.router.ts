import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../generated/enums";
import { categoryController } from "./category.controler";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation";

const router = Router();

router.get("/", categoryController.list);
router.get("/tree", categoryController.tree);
router.get("/:slug", categoryController.getBySlug);
router.post(
  "/",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(createCategorySchema),
  categoryController.create
);
router.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(updateCategorySchema),
  categoryController.update
);
router.delete("/:id", checkAuth(Role.ADMIN), categoryController.remove);

export const categoryRouter = router;
