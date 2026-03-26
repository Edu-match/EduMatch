-- AlterTable
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "legal_name" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "organization_type" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "InAppNotification" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT,
    "source_id" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InAppNotification_user_id_created_at_idx" ON "InAppNotification"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InAppNotification_user_id_kind_source_id_key" ON "InAppNotification"("user_id", "kind", "source_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InAppNotification_user_id_fkey'
  ) THEN
    ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
