-- AIナビゲーター利用規約同意日時を Profile テーブルに追加
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "ai_navigator_agreed_at" TIMESTAMP(3);
