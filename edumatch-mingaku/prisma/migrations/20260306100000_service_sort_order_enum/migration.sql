-- CreateEnum
CREATE TYPE "ServiceDisplayTier" AS ENUM ('プレミアム', 'スタンダード', 'ベーシック', 'その他');

-- AlterTable: 既存の sort_order (INT) を ENUM に移行
-- 1. 不正値を 3 に正規化
UPDATE "Service" SET "sort_order" = 3 WHERE "sort_order" IS NULL OR "sort_order" NOT IN (0, 1, 2, 3);

-- 2. 新カラム追加
ALTER TABLE "Service" ADD COLUMN "sort_order_tier" "ServiceDisplayTier";

-- 3. データ移行
UPDATE "Service" SET "sort_order_tier" = CASE
  WHEN "sort_order" = 0 THEN 'プレミアム'::"ServiceDisplayTier"
  WHEN "sort_order" = 1 THEN 'スタンダード'::"ServiceDisplayTier"
  WHEN "sort_order" = 2 THEN 'ベーシック'::"ServiceDisplayTier"
  ELSE 'その他'::"ServiceDisplayTier"
END;

-- 4. 旧カラム削除・リネーム
ALTER TABLE "Service" DROP COLUMN "sort_order";
ALTER TABLE "Service" RENAME COLUMN "sort_order_tier" TO "sort_order";

-- 5. デフォルトと NOT NULL
ALTER TABLE "Service" ALTER COLUMN "sort_order" SET DEFAULT 'その他'::"ServiceDisplayTier";
ALTER TABLE "Service" ALTER COLUMN "sort_order" SET NOT NULL;

-- 6. インデックス
DROP INDEX IF EXISTS "service_sort_order_idx";
CREATE INDEX "service_sort_order_idx" ON "Service"("sort_order", "created_at" DESC);
