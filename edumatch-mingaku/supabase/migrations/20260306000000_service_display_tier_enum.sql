-- Supabase Table Editor で sort_order をプルダウンで選択（プレミアム/スタンダード/ベーシック/その他）
-- 既存の 0,1,2,3 をそのまま引き継ぐ

-- 0. 同名の lookup テーブルがあれば削除（ENUM と名前が衝突するため）
DROP TABLE IF EXISTS "ServiceDisplayTier" CASCADE;
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_sort_order_fkey";

-- 2. 表示順を ENUM 型で定義（Supabase のセルがプルダウンになる）
DO $$ BEGIN
  CREATE TYPE "ServiceDisplayTier" AS ENUM ('プレミアム', 'スタンダード', 'ベーシック', 'その他');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. 既存の sort_order を 0〜3 に正規化（9999 などは「その他」に）
UPDATE "Service" SET sort_order = 3 WHERE sort_order IS NULL OR sort_order NOT IN (0, 1, 2, 3);

-- 4. 新カラムを追加して移行
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "sort_order_tier" "ServiceDisplayTier";

UPDATE "Service" SET "sort_order_tier" = CASE
  WHEN sort_order = 0 THEN 'プレミアム'::"ServiceDisplayTier"
  WHEN sort_order = 1 THEN 'スタンダード'::"ServiceDisplayTier"
  WHEN sort_order = 2 THEN 'ベーシック'::"ServiceDisplayTier"
  ELSE 'その他'::"ServiceDisplayTier"
END;

-- 5. 旧カラムを削除して新カラムを sort_order にリネーム
ALTER TABLE "Service" DROP COLUMN IF EXISTS "sort_order";
ALTER TABLE "Service" RENAME COLUMN "sort_order_tier" TO "sort_order";

-- 6. デフォルトと NOT NULL
ALTER TABLE "Service" ALTER COLUMN "sort_order" SET DEFAULT 'その他'::"ServiceDisplayTier";
ALTER TABLE "Service" ALTER COLUMN "sort_order" SET NOT NULL;

-- 7. インデックスを付け直す
DROP INDEX IF EXISTS "service_sort_order_idx";
CREATE INDEX "service_sort_order_idx" ON "Service" ("sort_order", "created_at" DESC);

COMMENT ON COLUMN "Service"."sort_order" IS '表示順ティア。Supabase Table Editor でプルダウン選択（プレミアム→スタンダード→ベーシック→その他）';
