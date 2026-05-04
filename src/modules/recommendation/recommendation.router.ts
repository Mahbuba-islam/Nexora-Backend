import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth";
import { recommendationController } from "./recommendation.controler";

const router = Router();

router.get(
  "/products/:productId/frequently-bought-together",
  recommendationController.fbt
);
router.get("/products/:productId/also-viewed", recommendationController.alsoViewed);
router.get("/for-you", optionalAuth, recommendationController.forYou);

export const recommendationRouter = router;
