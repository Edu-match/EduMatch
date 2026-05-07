-- サービス詳細の資料請求ボタン表示をサービスごとに切り替える
ALTER TABLE "Service"
ADD COLUMN IF NOT EXISTS "show_material_request_button" BOOLEAN DEFAULT true;

UPDATE "Service"
SET "show_material_request_button" = true
WHERE "show_material_request_button" IS NULL;

ALTER TABLE "Service"
ALTER COLUMN "show_material_request_button" SET NOT NULL;
