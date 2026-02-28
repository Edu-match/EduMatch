-- AlterTable
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "organization" TEXT;

-- AlterTable
ALTER TABLE "MaterialRequest" ADD COLUMN IF NOT EXISTS "delivery_organization" TEXT;
