-- 井戸端マップ：トピック間の「内容ベース」ノード接続（Gemma が日次生成）
-- 軸テーブルと同じく raw SQL で管理（アプリ側はテーブル未作成なら空配列にフォールバック）。
CREATE TABLE IF NOT EXISTS "interop_topic_edges" (
  "topic_no_a" INTEGER NOT NULL,
  "topic_no_b" INTEGER NOT NULL,
  "weight"     REAL NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("topic_no_a", "topic_no_b")
);
