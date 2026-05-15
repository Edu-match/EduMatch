-- 将来的にチュートリアル完了日時を永続化するための準備用マイグレーションです。
-- `edu_match_tutorial_done` は現在 localStorage で管理しているため、このファイルは作成のみで適用しません。

ALTER TABLE "Profile"
ADD COLUMN IF NOT EXISTS "tutorial_completed_at" TIMESTAMP WITH TIME ZONE;
