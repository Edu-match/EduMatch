-- サービス単位の表示用提供者アイコン。
-- アカウント本体の Profile.avatar_url とは独立して保存する。
ALTER TABLE "Service"
ADD COLUMN IF NOT EXISTS "provider_display_avatar_url" TEXT;
