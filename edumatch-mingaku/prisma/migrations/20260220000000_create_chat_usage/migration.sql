-- CreateTable
CREATE TABLE "ChatUsage" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "usage_date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChatUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatUsage_user_id_usage_date_key" ON "ChatUsage"("user_id", "usage_date");

-- CreateIndex
CREATE INDEX "ChatUsage_user_id_idx" ON "ChatUsage"("user_id");

-- AddForeignKey
ALTER TABLE "ChatUsage" ADD CONSTRAINT "ChatUsage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
