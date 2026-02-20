-- CreateTable
CREATE TABLE "ChatUsageWeekly" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "week_start" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChatUsageWeekly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatUsageWeekly_user_id_week_start_mode_key" ON "ChatUsageWeekly"("user_id", "week_start", "mode");

-- CreateIndex
CREATE INDEX "ChatUsageWeekly_user_id_idx" ON "ChatUsageWeekly"("user_id");

-- AddForeignKey
ALTER TABLE "ChatUsageWeekly" ADD CONSTRAINT "ChatUsageWeekly_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
