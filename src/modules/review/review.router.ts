import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../generated/enums";
import { reviewController } from "./review.controler";
import {
  createReviewSchema,
  moderateReviewSchema,
} from "./review.validation";

const router = Router();

router.get("/product/:productId", reviewController.listForProduct);
router.post(
  "/",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  validateRequest(createReviewSchema),
  reviewController.create
);
router.delete(
  "/:id",
  checkAuth(Role.CUSTOMER, Role.ADMIN, Role.STAFF),
  reviewController.remove
);
router.patch(
  "/:id/moderate",
  checkAuth(Role.ADMIN, Role.STAFF),
  validateRequest(moderateReviewSchema),
  reviewController.moderate
);

export const reviewRouter = router;
