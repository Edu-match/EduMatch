-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
                       ADD COLUMN "interest_other" TEXT;
