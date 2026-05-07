-- サービス単位の資料請求通知先メール
ALTER TABLE "Service"
ADD COLUMN IF NOT EXISTS "request_notification_emails" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Service"
SET "request_notification_emails" = ARRAY[]::TEXT[]
WHERE "request_notification_emails" IS NULL;

ALTER TABLE "Service"
ALTER COLUMN "request_notification_emails" SET NOT NULL;
