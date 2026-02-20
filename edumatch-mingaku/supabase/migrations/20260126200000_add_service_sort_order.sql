-- サービスの表示順序を管理するカラムを追加
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 9999;

-- 既存のインデックス追加（並べ替え用）
CREATE INDEX IF NOT EXISTS service_sort_order_idx ON "Service" (sort_order, created_at DESC);
