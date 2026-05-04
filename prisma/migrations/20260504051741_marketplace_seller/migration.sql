/*
  Warnings:

  - Added the required column `sellerId` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SellerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('STRIPE_CONNECT', 'MANUAL_BANK');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SellerOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURN_REQUESTED', 'RETURNED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SELLER_APPLICATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'SELLER_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'SELLER_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'SELLER_SUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_SELLER_ORDER';
ALTER TYPE "NotificationType" ADD VALUE 'SELLER_ORDER_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'LOW_STOCK';
ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_INITIATED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_PAID';
ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_SELLER_APPLICATION';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SELLER';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SELLER';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "sellerId" UUID,
ADD COLUMN     "sellerOrderId" UUID;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "sellerId" UUID NOT NULL;

-- CreateTable
CREATE TABLE "seller_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sellerOrderNumber" VARCHAR(50) NOT NULL,
    "orderId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "status" "SellerOrderStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shippingTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(12,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "commissionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payoutAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "courier" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" VARCHAR(500),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "sellerNote" TEXT,
    "customerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_order_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sellerOrderId" UUID NOT NULL,
    "fromStatus" "SellerOrderStatus",
    "toStatus" "SellerOrderStatus" NOT NULL,
    "note" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sellerId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "commissionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "refundAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "adjustmentAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "method" "PayoutMethod" NOT NULL DEFAULT 'MANUAL_BANK',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "stripeTransferId" TEXT,
    "bankReference" TEXT,
    "failureReason" TEXT,
    "notes" TEXT,
    "initiatedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_payout_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payoutId" UUID,
    "sellerOrderId" UUID NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "commissionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "refundAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_payout_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sellers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "shopName" VARCHAR(120) NOT NULL,
    "shopSlug" VARCHAR(140) NOT NULL,
    "tagline" VARCHAR(200),
    "description" TEXT,
    "logo" VARCHAR(500),
    "banner" VARCHAR(500),
    "contactEmail" VARCHAR(160) NOT NULL,
    "contactPhone" VARCHAR(40),
    "websiteUrl" VARCHAR(500),
    "legalName" VARCHAR(200),
    "businessType" VARCHAR(60),
    "taxId" VARCHAR(80),
    "registrationNo" VARCHAR(120),
    "addressLine1" VARCHAR(200),
    "addressLine2" VARCHAR(200),
    "city" VARCHAR(120),
    "state" VARCHAR(120),
    "country" VARCHAR(2),
    "postalCode" VARCHAR(20),
    "returnPolicy" TEXT,
    "shippingPolicy" TEXT,
    "status" "SellerStatus" NOT NULL DEFAULT 'PENDING',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "rejectionReason" TEXT,
    "suspensionReason" TEXT,
    "applicationData" JSONB,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "payoutMethod" "PayoutMethod" NOT NULL DEFAULT 'MANUAL_BANK',
    "stripeAccountId" TEXT,
    "stripeOnboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "bankAccountHolderName" VARCHAR(200),
    "bankAccountNumber" VARCHAR(80),
    "bankRoutingNumber" VARCHAR(80),
    "bankName" VARCHAR(200),
    "bankCountry" VARCHAR(2),
    "commissionRate" DECIMAL(5,2),
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "totalSales" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "avgRating" DECIMAL(3,2),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_orders_sellerOrderNumber_key" ON "seller_orders"("sellerOrderNumber");

-- CreateIndex
CREATE INDEX "seller_orders_orderId_idx" ON "seller_orders"("orderId");

-- CreateIndex
CREATE INDEX "seller_orders_sellerId_idx" ON "seller_orders"("sellerId");

-- CreateIndex
CREATE INDEX "seller_orders_status_idx" ON "seller_orders"("status");

-- CreateIndex
CREATE INDEX "seller_orders_sellerOrderNumber_idx" ON "seller_orders"("sellerOrderNumber");

-- CreateIndex
CREATE INDEX "seller_order_status_history_sellerOrderId_idx" ON "seller_order_status_history"("sellerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_payouts_stripeTransferId_key" ON "seller_payouts"("stripeTransferId");

-- CreateIndex
CREATE INDEX "seller_payouts_sellerId_idx" ON "seller_payouts"("sellerId");

-- CreateIndex
CREATE INDEX "seller_payouts_status_idx" ON "seller_payouts"("status");

-- CreateIndex
CREATE INDEX "seller_payouts_periodStart_periodEnd_idx" ON "seller_payouts"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "seller_payout_items_sellerOrderId_key" ON "seller_payout_items"("sellerOrderId");

-- CreateIndex
CREATE INDEX "seller_payout_items_payoutId_idx" ON "seller_payout_items"("payoutId");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_userId_key" ON "sellers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_shopName_key" ON "sellers"("shopName");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_shopSlug_key" ON "sellers"("shopSlug");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_stripeAccountId_key" ON "sellers"("stripeAccountId");

-- CreateIndex
CREATE INDEX "sellers_shopSlug_idx" ON "sellers"("shopSlug");

-- CreateIndex
CREATE INDEX "sellers_status_idx" ON "sellers"("status");

-- CreateIndex
CREATE INDEX "sellers_isDeleted_idx" ON "sellers"("isDeleted");

-- CreateIndex
CREATE INDEX "order_items_sellerOrderId_idx" ON "order_items"("sellerOrderId");

-- CreateIndex
CREATE INDEX "order_items_sellerId_idx" ON "order_items"("sellerId");

-- CreateIndex
CREATE INDEX "products_sellerId_idx" ON "products"("sellerId");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "seller_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_orders" ADD CONSTRAINT "seller_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_orders" ADD CONSTRAINT "seller_orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_order_status_history" ADD CONSTRAINT "seller_order_status_history_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "seller_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_payout_items" ADD CONSTRAINT "seller_payout_items_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "seller_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_payout_items" ADD CONSTRAINT "seller_payout_items_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "seller_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
