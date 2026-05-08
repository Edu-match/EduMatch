-- サービス個別の表示順を管理するためのカラムを追加
ALTER TABLE "Service"
ADD COLUMN IF NOT EXISTS "display_order" INTEGER DEFAULT 999;

UPDATE "Service"
SET "display_order" = 999
WHERE "display_order" IS NULL;

ALTER TABLE "Service"
ALTER COLUMN "display_order" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "service_display_order_idx"
ON "Service"("display_order", "created_at" DESC);
