ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "notes" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_companyId_code_key" ON "Customer"("companyId", "code");

ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "notes" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_companyId_code_key" ON "Supplier"("companyId", "code");

ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS "Account_companyId_code_key" ON "Account"("companyId", "code");

ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "sku" TEXT;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "billId" TEXT;

ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "balanceDue" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "taxableAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "taxTotal" DECIMAL(18,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "BillItem" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId" TEXT NOT NULL,
  "billId" TEXT NOT NULL,
  "itemId" TEXT,
  "sku" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "karat" TEXT NOT NULL,
  "grossWt" DECIMAL(10,3) NOT NULL,
  "netWt" DECIMAL(10,3) NOT NULL,
  "stoneWt" DECIMAL(10,3) NOT NULL,
  "makingType" TEXT NOT NULL,
  "makingRate" DECIMAL(18,2) NOT NULL,
  "makingAmount" DECIMAL(18,2) NOT NULL,
  "ratePerGram" DECIMAL(18,2) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "discountPct" DECIMAL(5,2) NOT NULL,
  "gstPct" DECIMAL(5,2) NOT NULL,
  "hsnCode" TEXT NOT NULL,
  "total" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  CONSTRAINT "BillItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "accountName" TEXT;
ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "accountNoMasked" TEXT;
ALTER TABLE "BankAccount" ALTER COLUMN "accountNo" DROP NOT NULL;
ALTER TABLE "BankAccount" ALTER COLUMN "openingBalance" SET DEFAULT 0;
ALTER TABLE "BankAccount" ALTER COLUMN "currentBalance" SET DEFAULT 0;
ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "bookBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "bankBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "unreconciledCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "BankTransaction" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'BANK_STATEMENT';

CREATE TABLE IF NOT EXISTS "InventoryAdjustmentLine" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId" TEXT NOT NULL,
  "adjustmentId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "currentQty" DECIMAL(18,3) NOT NULL,
  "currentWt" DECIMAL(18,3) NOT NULL,
  "adjustedQty" DECIMAL(18,3) NOT NULL,
  "adjustedWt" DECIMAL(18,3) NOT NULL,
  "diffQty" DECIMAL(18,3) NOT NULL,
  "diffWt" DECIMAL(18,3) NOT NULL,
  "oldRate" DECIMAL(18,2) NOT NULL,
  "newRate" DECIMAL(18,2) NOT NULL,
  "valueImpact" DECIMAL(18,2) NOT NULL,
  "accountId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  CONSTRAINT "InventoryAdjustmentLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JournalTemplate" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "narration" TEXT,
  "lines" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  CONSTRAINT "JournalTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NoteDocument" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId" TEXT NOT NULL,
  "noteNo" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "partyType" TEXT NOT NULL,
  "customerId" TEXT,
  "supplierId" TEXT,
  "referenceNo" TEXT,
  "reason" TEXT,
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "subTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "grandTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  CONSTRAINT "NoteDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NoteLine" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId" TEXT NOT NULL,
  "noteId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL DEFAULT 1,
  "rate" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "gstPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  CONSTRAINT "NoteLine_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BillItem_billId_fkey') THEN
    ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BillItem_itemId_fkey') THEN
    ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryAdjustmentLine_adjustmentId_fkey') THEN
    ALTER TABLE "InventoryAdjustmentLine" ADD CONSTRAINT "InventoryAdjustmentLine_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "InventoryAdjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryAdjustmentLine_itemId_fkey') THEN
    ALTER TABLE "InventoryAdjustmentLine" ADD CONSTRAINT "InventoryAdjustmentLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NoteLine_noteId_fkey') THEN
    ALTER TABLE "NoteLine" ADD CONSTRAINT "NoteLine_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "NoteDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
