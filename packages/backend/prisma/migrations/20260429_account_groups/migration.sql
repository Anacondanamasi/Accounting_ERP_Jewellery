CREATE TABLE IF NOT EXISTS "AccountGroup" (
  "id" SERIAL NOT NULL,
  "companyId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  CONSTRAINT "AccountGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountGroup_companyId_name_key" ON "AccountGroup"("companyId", "name");
CREATE INDEX IF NOT EXISTS "AccountGroup_companyId_type_idx" ON "AccountGroup"("companyId", "type");

ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "groupId" INTEGER;
CREATE INDEX IF NOT EXISTS "Account_companyId_groupId_idx" ON "Account"("companyId", "groupId");

UPDATE "Account"
SET "type" = CASE UPPER("type")
  WHEN 'ASSET' THEN 'Asset'
  WHEN 'LIABILITY' THEN 'Liability'
  WHEN 'EQUITY' THEN 'Equity'
  WHEN 'INCOME' THEN 'Income'
  WHEN 'REVENUE' THEN 'Income'
  WHEN 'EXPENSE' THEN 'Expense'
  ELSE "type"
END;

INSERT INTO "AccountGroup" ("companyId", "name", "type", "createdBy")
SELECT DISTINCT ON (a."companyId", a."group")
  a."companyId",
  a."group",
  COALESCE(NULLIF(a."type", ''), 'Asset'),
  COALESCE(NULLIF(a."createdBy", ''), 'system')
FROM "Account" a
WHERE a."group" IS NOT NULL
  AND a."group" <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "AccountGroup" g
    WHERE g."companyId" = a."companyId"
      AND g."name" = a."group"
  )
ORDER BY a."companyId", a."group", a."id";

UPDATE "Account" a
SET "groupId" = g."id"
FROM "AccountGroup" g
WHERE a."companyId" = g."companyId"
  AND a."group" = g."name"
  AND a."groupId" IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AccountGroup_companyId_fkey') THEN
    ALTER TABLE "AccountGroup" ADD CONSTRAINT "AccountGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_groupId_fkey') THEN
    ALTER TABLE "Account" ADD CONSTRAINT "Account_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AccountGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
