-- CreateTable
CREATE TABLE "UserReport" (
    "id" TEXT NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reported_user_id" UUID NOT NULL,
    "reason_code" TEXT NOT NULL,
    "detail" TEXT,
    "context_kind" TEXT NOT NULL,
    "context_excerpt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserReport_reported_user_id_created_at_idx" ON "UserReport"("reported_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "UserReport_reporter_id_idx" ON "UserReport"("reporter_id");

-- CreateIndex
CREATE INDEX "UserReport_created_at_idx" ON "UserReport"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
