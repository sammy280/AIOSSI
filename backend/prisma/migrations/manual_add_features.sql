-- Manual migration: Add billType, emergencyPhone, CreditSale, DailyReport, CREDIT payment
-- Run this when your DB is up: psql -d sammy_erp -f this_file.sql

-- 1. Add BillType enum
DO $$ BEGIN
  CREATE TYPE "BillType" AS ENUM ('EBM', 'NORMAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Add CreditStatus enum
DO $$ BEGIN
  CREATE TYPE "CreditStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Add CREDIT to PaymentMethod enum
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CREDIT';

-- 4. Add billType to Bill table
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "billType" "BillType" NOT NULL DEFAULT 'NORMAL';

-- 5. Add emergencyPhone to EmployeeProfile
ALTER TABLE "EmployeeProfile" ADD COLUMN IF NOT EXISTS "emergencyPhone" TEXT;

-- 6. Create CreditSale table
CREATE TABLE IF NOT EXISTS "CreditSale" (
  "id"            TEXT NOT NULL,
  "billId"        TEXT,
  "customerName"  TEXT NOT NULL,
  "customerPhone" TEXT,
  "customerRole"  TEXT,
  "amount"        DECIMAL(10,2) NOT NULL,
  "amountPaid"    DECIMAL(10,2) NOT NULL DEFAULT 0,
  "balance"       DECIMAL(10,2) NOT NULL,
  "status"        "CreditStatus" NOT NULL DEFAULT 'PENDING',
  "approvedById"  TEXT,
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditSale_pkey" PRIMARY KEY ("id")
);

-- 7. Create CreditPayment table
CREATE TABLE IF NOT EXISTS "CreditPayment" (
  "id"           TEXT NOT NULL,
  "creditSaleId" TEXT NOT NULL,
  "amount"       DECIMAL(10,2) NOT NULL,
  "paidAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receivedById" TEXT NOT NULL,
  "notes"        TEXT,
  CONSTRAINT "CreditPayment_pkey" PRIMARY KEY ("id")
);

-- 8. Create DailyReport table
CREATE TABLE IF NOT EXISTS "DailyReport" (
  "id"               TEXT NOT NULL,
  "date"             TIMESTAMP(3) NOT NULL,
  "totalCash"        DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalMomo"        DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalCard"        DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalCredit"      DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalExpenses"    DECIMAL(10,2) NOT NULL DEFAULT 0,
  "barSales"         DECIMAL(10,2) NOT NULL DEFAULT 0,
  "kitchenSales"     DECIMAL(10,2) NOT NULL DEFAULT 0,
  "recoveryAmount"   DECIMAL(10,2) NOT NULL DEFAULT 0,
  "creditBreakdown"  JSONB,
  "expenseBreakdown" JSONB,
  "notes"            TEXT,
  "isFinalized"      BOOLEAN NOT NULL DEFAULT false,
  "createdById"      TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- 9. Add foreign keys (if tables exist)
ALTER TABLE "CreditSale"
  ADD CONSTRAINT "CreditSale_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CreditPayment"
  ADD CONSTRAINT "CreditPayment_creditSaleId_fkey" FOREIGN KEY ("creditSaleId") REFERENCES "CreditSale"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CreditPayment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DailyReport"
  ADD CONSTRAINT "DailyReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 10. Add baseSalary to EmployeeProfile
ALTER TABLE "EmployeeProfile" ADD COLUMN IF NOT EXISTS "baseSalary" DECIMAL(10,2) DEFAULT 0;

-- 11. Requisition module enums
DO $$ BEGIN
  CREATE TYPE "RequisitionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PURCHASED', 'DELIVERED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "RequisitionCategory" AS ENUM ('FOOD', 'BEVERAGES', 'MATERIALS', 'CLEANING_SUPPLIES', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 12. Requisition table
CREATE TABLE IF NOT EXISTS "Requisition" (
  "id"            TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "category"      "RequisitionCategory" NOT NULL DEFAULT 'OTHER',
  "notes"         TEXT,
  "status"        "RequisitionStatus" NOT NULL DEFAULT 'PENDING',
  "urgency"       TEXT NOT NULL DEFAULT 'NORMAL',
  "requestedById" TEXT NOT NULL,
  "reviewedById"  TEXT,
  "reviewNote"    TEXT,
  "reviewedAt"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Requisition_pkey" PRIMARY KEY ("id")
);

-- 13. RequisitionItem table
CREATE TABLE IF NOT EXISTS "RequisitionItem" (
  "id"            TEXT NOT NULL,
  "requisitionId" TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "quantity"      DECIMAL(10,2) NOT NULL,
  "unit"          TEXT NOT NULL DEFAULT 'unit',
  "estimatedCost" DECIMAL(10,2),
  "notes"         TEXT,
  CONSTRAINT "RequisitionItem_pkey" PRIMARY KEY ("id")
);

-- 14. PurchaseOrder table
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id"            TEXT NOT NULL,
  "requisitionId" TEXT NOT NULL UNIQUE,
  "supplier"      TEXT,
  "totalCost"     DECIMAL(10,2) NOT NULL DEFAULT 0,
  "status"        TEXT NOT NULL DEFAULT 'PENDING',
  "notes"         TEXT,
  "createdById"   TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- 15. Foreign keys for requisitions
ALTER TABLE "Requisition"
  ADD CONSTRAINT "Requisition_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Requisition"
  ADD CONSTRAINT "Requisition_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RequisitionItem"
  ADD CONSTRAINT "RequisitionItem_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 16. Inventory bottle size columns
ALTER TABLE "InventoryItem"
  ADD COLUMN IF NOT EXISTS "fullBottles" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "halfBottles" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "quarterBottles" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fullBottlePrice" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "halfBottlePrice" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "quarterBottlePrice" DECIMAL(10,2);
