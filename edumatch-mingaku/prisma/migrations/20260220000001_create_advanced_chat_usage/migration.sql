-- CreateTable
CREATE TABLE "AdvancedChatUsage" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "week_start" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdvancedChatUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdvancedChatUsage_user_id_week_start_key" ON "AdvancedChatUsage"("user_id", "week_start");

-- CreateIndex
CREATE INDEX "AdvancedChatUsage_user_id_idx" ON "AdvancedChatUsage"("user_id");

-- AddForeignKey
ALTER TABLE "AdvancedChatUsage" ADD CONSTRAINT "AdvancedChatUsage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
