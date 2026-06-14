-- モデレーションのトーン判定（ネガ/非建設的否定/キツい言い方）。掲載は可だが警告バッジ＋Slack通知。
-- "" = 問題なし / negative / non_constructive / harsh
ALTER TABLE "forum_posts"   ADD COLUMN IF NOT EXISTS "tone_flag"   TEXT NOT NULL DEFAULT '';
ALTER TABLE "forum_posts"   ADD COLUMN IF NOT EXISTS "tone_reason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "forum_replies" ADD COLUMN IF NOT EXISTS "tone_flag"   TEXT NOT NULL DEFAULT '';
ALTER TABLE "forum_replies" ADD COLUMN IF NOT EXISTS "tone_reason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "interop_posts" ADD COLUMN IF NOT EXISTS "tone_flag"   TEXT NOT NULL DEFAULT '';
ALTER TABLE "interop_posts" ADD COLUMN IF NOT EXISTS "tone_reason" TEXT NOT NULL DEFAULT '';
