-- CreateTable
CREATE TABLE "ChatUsageDaily" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "usage_date" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChatUsageDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatUsageDaily_user_id_usage_date_mode_key" ON "ChatUsageDaily"("user_id", "usage_date", "mode");

-- CreateIndex
CREATE INDEX "ChatUsageDaily_user_id_idx" ON "ChatUsageDaily"("user_id");

-- AddForeignKey
ALTER TABLE "ChatUsageDaily" ADD CONSTRAINT "ChatUsageDaily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
