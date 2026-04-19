-- 関心のあるカテゴリと「その他」の自由記述をProfileテーブルに追加
ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "interests"       TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "interest_other"  TEXT;
