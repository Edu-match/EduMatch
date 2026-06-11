-- トップマップの28話題玉をDB管理化する interop_topics テーブル（非破壊）
CREATE TABLE IF NOT EXISTS "interop_topics" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "no"         INTEGER NOT NULL,
  "major"      TEXT NOT NULL DEFAULT 'F',
  "name"       TEXT NOT NULL,
  "room_id"    TEXT NOT NULL DEFAULT '',
  "topic1"     TEXT NOT NULL DEFAULT '',
  "topic2"     TEXT NOT NULL DEFAULT '',
  "topic3"     TEXT NOT NULL DEFAULT '',
  "axis_x"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "axis_y"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "interop_topics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "interop_topics_no_key" ON "interop_topics"("no");
