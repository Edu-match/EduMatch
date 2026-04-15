-- =============================================================================
-- Profile を「一般ユーザー」「サービス事業者」に分離する（Supabase SQL Editor 用）
-- =============================================================================
-- 前提: public."Profile" が存在し、以下の列を持つこと（未適用の環境では先に Prisma マイグレーション等で列を追加してください）
-- 実行後: アプリ側で npx prisma generate を実行し、schema.prisma を本マイグレーションに合わせてください。
--
-- 内容:
-- 1) "GeneralUser" … 一般ユーザー専用（所属・年代・本名など）
-- 2) "ServiceBusiness" … サービス事業者専用（資料請求通知先・事業者住所など）
-- 3) "Profile" から上記へ移した列を DROP
-- 4) role=PROVIDER を VIEWER に寄せ、事業者は ServiceBusiness 行の有無で判別する方針に合わせる
-- 5) auth トリガー handle_new_user を常に VIEWER で作成するよう更新
-- 6) 権限: authenticated / service_role 向け GRANT（必要に応じて調整）
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. 拡張テーブル作成
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."GeneralUser" (
  "id" UUID NOT NULL PRIMARY KEY
    REFERENCES public."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "legal_name" TEXT,
  "age" TEXT,
  "organization" TEXT,
  "organization_type" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."ServiceBusiness" (
  "id" UUID NOT NULL PRIMARY KEY
    REFERENCES public."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "legal_name" TEXT,
  "organization" TEXT,
  "organization_type" TEXT,
  "notification_email_2" TEXT,
  "notification_email_3" TEXT,
  "address" TEXT,
  "city" TEXT,
  "postal_code" TEXT,
  "prefecture" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public."GeneralUser" IS '一般ユーザー属性（SNS・マッチング等の拡張用）。auth.users / Profile と 1:1。';
COMMENT ON TABLE public."ServiceBusiness" IS 'サービス事業者属性（資料請求通知・事業者住所等）。Profile と 1:1。';

-- ---------------------------------------------------------------------------
-- 2. 既存データの移行
--    事業者: role=PROVIDER、または Service / Post を持つ provider_id
--    上記以外: GeneralUser
-- ---------------------------------------------------------------------------

WITH provider_ids AS (
  SELECT DISTINCT p.id
  FROM public."Profile" p
  WHERE p.role::text = 'PROVIDER'
  UNION
  SELECT DISTINCT s."provider_id" AS id FROM public."Service" s WHERE s."provider_id" IS NOT NULL
  UNION
  SELECT DISTINCT po."provider_id" AS id FROM public."Post" po WHERE po."provider_id" IS NOT NULL
)
INSERT INTO public."ServiceBusiness" (
  "id",
  "legal_name",
  "organization",
  "organization_type",
  "notification_email_2",
  "notification_email_3",
  "address",
  "city",
  "postal_code",
  "prefecture",
  "created_at",
  "updated_at"
)
SELECT
  p."id",
  p."legal_name",
  p."organization",
  p."organization_type",
  p."notification_email_2",
  p."notification_email_3",
  p."address",
  p."city",
  p."postal_code",
  p."prefecture",
  p."created_at",
  p."updated_at"
FROM public."Profile" p
INNER JOIN provider_ids pi ON pi.id = p.id
ON CONFLICT ("id") DO UPDATE SET
  "legal_name" = EXCLUDED."legal_name",
  "organization" = EXCLUDED."organization",
  "organization_type" = EXCLUDED."organization_type",
  "notification_email_2" = EXCLUDED."notification_email_2",
  "notification_email_3" = EXCLUDED."notification_email_3",
  "address" = EXCLUDED."address",
  "city" = EXCLUDED."city",
  "postal_code" = EXCLUDED."postal_code",
  "prefecture" = EXCLUDED."prefecture",
  "updated_at" = EXCLUDED."updated_at";

INSERT INTO public."GeneralUser" (
  "id",
  "legal_name",
  "age",
  "organization",
  "organization_type",
  "created_at",
  "updated_at"
)
SELECT
  p."id",
  p."legal_name",
  -- Profile に age 列が無い環境があるため、移行時は NULL（必要ならアプリで再入力）
  NULL::text AS "age",
  p."organization",
  p."organization_type",
  p."created_at",
  p."updated_at"
FROM public."Profile" p
WHERE NOT EXISTS (
  SELECT 1 FROM public."ServiceBusiness" sb WHERE sb."id" = p."id"
)
ON CONFLICT ("id") DO NOTHING;

-- ADMIN など事業者行が無いユーザーは GeneralUser に載る（上記 WHERE でカバー）

-- ---------------------------------------------------------------------------
-- 3. Role の整理（事業者も DB 上は VIEWER。事業者判定は ServiceBusiness 行）
-- ---------------------------------------------------------------------------

UPDATE public."Profile"
SET "role" = 'VIEWER'::public."Role"
WHERE "role"::text = 'PROVIDER';

-- ---------------------------------------------------------------------------
-- 4. Profile から移行済み列を削除
--    存在しない列の DROP はエラーになるため、本番と同じスキーマであることを確認してから実行してください。
-- ---------------------------------------------------------------------------

ALTER TABLE public."Profile" DROP COLUMN IF EXISTS "notification_email_2";
ALTER TABLE public."Profile" DROP COLUMN IF EXISTS "notification_email_3";
ALTER TABLE public."Profile" DROP COLUMN IF EXISTS "address";
ALTER TABLE public."Profile" DROP COLUMN IF EXISTS "city";
ALTER TABLE public."Profile" DROP COLUMN IF EXISTS "postal_code";
ALTER TABLE public."Profile" DROP COLUMN IF EXISTS "prefecture";
ALTER TABLE public."Profile" DROP COLUMN IF EXISTS "legal_name";
ALTER TABLE public."Profile" DROP COLUMN IF EXISTS "age";
ALTER TABLE public."Profile" DROP COLUMN IF EXISTS "organization";
ALTER TABLE public."Profile" DROP COLUMN IF EXISTS "organization_type";

-- ---------------------------------------------------------------------------
-- 5. Auth トリガー: 新規ユーザーは常に VIEWER の Profile のみ作成（拡張行はアプリで作成）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."Profile" (
    "id",
    "name",
    "email",
    "role",
    "subscription_status",
    "created_at",
    "updated_at"
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'VIEWER'::public."Role",
    'INACTIVE',
    NOW(),
    NOW()
  )
  ON CONFLICT ("id") DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'auth.users 挿入時に Profile を作成。role は常に VIEWER。事業者・一般の別は GeneralUser / ServiceBusiness で管理。';

-- ---------------------------------------------------------------------------
-- 6. 権限（Supabase: anon / authenticated / service_role）
--    アプリが Prisma で DB 直結の場合でも、将来の Supabase クライアント利用に備える。
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public."GeneralUser" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ServiceBusiness" TO service_role;

-- authenticated は必要に応じて。RLS を使わない方針ならバックエンドのみ service_role でも可。
GRANT SELECT, INSERT, UPDATE, DELETE ON public."GeneralUser" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ServiceBusiness" TO authenticated;

-- RLS は無効のまま運用する想定（既存 Profile と同様）。有効化する場合は別途ポリシー定義が必要。
ALTER TABLE public."GeneralUser" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."ServiceBusiness" DISABLE ROW LEVEL SECURITY;

COMMIT;
