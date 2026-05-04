import { Router } from "express";
import { checkAuth } from "../../middleware/cheackAuth";
import { Role } from "../../generated/enums";
import { statsController } from "./stats.controler";

const router = Router();

router.use(checkAuth(Role.ADMIN, Role.STAFF));

router.get("/overview", statsController.overview);
router.get("/recent-orders", statsController.recentOrders);
router.get("/top-products", statsController.topProducts);
router.get("/revenue", statsController.revenueByDay);
router.get("/marketplace", statsController.marketplace);
router.get("/top-sellers", statsController.topSellers);
router.get("/payout-pipeline", statsController.payoutPipeline);

export const StatsRoutes = router;
