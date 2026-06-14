-- Prod2 / preview 環境で Prisma より DB が古いときの穴埋め
-- 記事(Post)は出るが Service 一覧が空、カテゴリルームが開けない場合に実行

-- Service（一覧取得で必要）
ALTER TABLE public."Service"
  ADD COLUMN IF NOT EXISTS "display_order" INTEGER NOT NULL DEFAULT 999;

ALTER TABLE public."Service"
  ADD COLUMN IF NOT EXISTS "provider_display_avatar_url" TEXT;

ALTER TABLE public."Service"
  ADD COLUMN IF NOT EXISTS "show_material_request_button" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public."Service"
  ADD COLUMN IF NOT EXISTS "request_notification_emails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "service_display_order_idx"
  ON public."Service" ("display_order", "created_at" DESC);

-- forum_rooms（カテゴリルーム作成で必要）
ALTER TABLE public.forum_rooms
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;
