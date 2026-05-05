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

// Analytics page
router.get("/orders-timeseries", statsController.ordersTimeseries);
router.get("/sales-by-category", statsController.salesByCategory);
router.get("/customer-acquisition", statsController.customerAcquisition);
router.get("/refund-metrics", statsController.refundMetrics);
router.get("/top-customers", statsController.topCustomers);
router.get("/conversion-funnel", statsController.conversionFunnel);
router.get("/inventory-health", statsController.inventoryHealth);

export const StatsRoutes = router;
