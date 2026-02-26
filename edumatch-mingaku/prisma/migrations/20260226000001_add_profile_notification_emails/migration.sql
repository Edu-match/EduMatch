-- 資料請求通知を最大3件のメールアドレスに送信するため、Profile に追加送信先を追加
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "notification_email_2" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "notification_email_3" TEXT;
