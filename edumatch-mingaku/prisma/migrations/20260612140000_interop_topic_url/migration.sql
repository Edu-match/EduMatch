-- 話題玉に参考URL（概要下にサムネ表示）を追加（非破壊）
ALTER TABLE "interop_topics" ADD COLUMN IF NOT EXISTS "url" TEXT NOT NULL DEFAULT '';
