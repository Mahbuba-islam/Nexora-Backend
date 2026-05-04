import { Router } from "express";

import { authRoutes } from "./modules/auth/auth.router";
import { userRouter } from "./modules/user/user.router";
import { adminRouter } from "./modules/admin/admin.router";

import { categoryRouter } from "./modules/category/category.router";
import { brandRouter } from "./modules/brand/brand.router";
import { productRouter } from "./modules/product/product.router";
import { sellerRouter } from "./modules/seller/seller.router";

import { cartRouter } from "./modules/cart/cart.router";
import { orderRouter } from "./modules/order/order.router";
import { sellerOrderRouter } from "./modules/sellerOrder/sellerOrder.router";
import { payoutRouter } from "./modules/payout/payout.router";
import { addressRouter } from "./modules/address/address.router";
import { reviewRouter } from "./modules/review/review.router";
import { wishlistRouter } from "./modules/wishlist/wishlist.router";

import { StatsRoutes } from "./modules/stats/stats.router";
import { PaymentRoutes } from "./modules/payment/payment.router";
import { notificationRouter } from "./modules/notification/notification.route";
import { aiRoutes } from "./modules/ai/ai.router";
import { couponRouter } from "./modules/coupon/coupon.router";

const router = Router();

// Auth + Users
router.use("/auth", authRoutes);
router.use("/users", userRouter);
router.use("/admin", adminRouter);

// Catalog
router.use("/categories", categoryRouter);
router.use("/brands", brandRouter);
router.use("/products", productRouter);

// Marketplace (sellers / shops)
router.use("/sellers", sellerRouter);

// Commerce
router.use("/cart", cartRouter);
router.use("/orders", orderRouter);
router.use("/seller-orders", sellerOrderRouter);
router.use("/payouts", payoutRouter);
router.use("/addresses", addressRouter);
router.use("/reviews", reviewRouter);
router.use("/wishlist", wishlistRouter);
router.use("/coupons", couponRouter);

// Payments
router.use("/payments", PaymentRoutes);

// Notifications, AI, stats
router.use("/notifications", notificationRouter);
router.use("/ai", aiRoutes);
router.use("/stats", StatsRoutes);

export const indexRoutes = router;
