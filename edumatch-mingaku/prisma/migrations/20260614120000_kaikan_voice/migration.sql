-- 教育AIサミット＠議員会館 特設ページ「ご意見・要望」の書き込み（来場者・ログイン不要）。
-- 既存テーブルへのFK追加なしの独立テーブル（additive）。
CREATE TABLE IF NOT EXISTS "kaikan_voices" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "author_name" TEXT         NOT NULL DEFAULT '',
    "body"        TEXT         NOT NULL,
    "is_hidden"   BOOLEAN      NOT NULL DEFAULT false,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "kaikan_voices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "kaikan_voices_created_at_idx" ON "kaikan_voices" ("created_at");
