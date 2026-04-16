-- =============================================================================
-- Profile を「一般ユーザー」「企業ユーザー」に分離する（Supabase SQL Editor 用）
-- =============================================================================
-- 前提: public."Profile" に少なくとも id, name, email, role, created_at, updated_at があること。
-- 所属・通知先などの列は「無い／既に DROP 済み」の DB があるため、移行 INSERT では参照せず NULL とする（本名相当は name のみコピー）。
-- 実行後: アプリ側で npx prisma generate を実行し、schema.prisma を本マイグレーションに合わせてください。
--
-- 内容:
-- 1) "GeneralProfile" … 一般ユーザー向け（現状は role=ADMIN のみ移管。所属・年代・本名など）
-- 2) "CorporateProfile" … 企業ユーザー向け（資料請求通知先・事業者住所など）
-- 3) 移行時 GeneralProfile / CorporateProfile の legal_name は Profile.name を使用
--    （Profile に legal_name 列が無い／既に DROP 済みの環境があるため COALESCE は使わない）
-- 4) "Profile" から上記へ移した列を DROP
-- 5) role=PROVIDER を VIEWER に寄せ、企業ユーザーは CorporateProfile 行の有無で判別
-- 6) auth トリガー handle_new_user を常に VIEWER で作成するよう更新
-- 7) 権限: authenticated / service_role 向け GRANT（必要に応じて調整）
--
-- 既に旧名 "GeneralUser" / "ServiceBusiness" でテーブル作成済みの場合は、
-- 20260415140000_rename_tables_to_general_corporate_profile.sql を先に実行してください。
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. 拡張テーブル作成
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."GeneralProfile" (
  "id" UUID NOT NULL PRIMARY KEY
    REFERENCES public."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "legal_name" TEXT,
  "age" TEXT,
  "organization" TEXT,
  "organization_type" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."CorporateProfile" (
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

COMMENT ON TABLE public."GeneralProfile" IS '一般ユーザー向け属性（SNS・マッチング等）。auth.users / Profile と 1:1。';
COMMENT ON TABLE public."CorporateProfile" IS '企業ユーザー向け属性（資料請求通知・事業者住所等）。Profile と 1:1。';

-- ---------------------------------------------------------------------------
-- 2. 既存データの移行
--    企業側: role=PROVIDER、または Service / Post を持つ provider_id → CorporateProfile
--    一般側: 現状は ADMIN のみを想定し、role=ADMIN かつ CorporateProfile に無い行のみ GeneralProfile へ
--    所属・通知先等: Profile に列が無い環境向けに NULL（name のみ各テーブルの legal_name にコピー）
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
INSERT INTO public."CorporateProfile" (
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
  p."name" AS "legal_name",
  NULL::text AS "organization",
  NULL::text AS "organization_type",
  NULL::text AS "notification_email_2",
  NULL::text AS "notification_email_3",
  NULL::text AS "address",
  NULL::text AS "city",
  NULL::text AS "postal_code",
  NULL::text AS "prefecture",
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

INSERT INTO public."GeneralProfile" (
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
  p."name" AS "legal_name",
  NULL::text AS "age",
  NULL::text AS "organization",
  NULL::text AS "organization_type",
  p."created_at",
  p."updated_at"
FROM public."Profile" p
WHERE p."role"::text = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM public."CorporateProfile" cp WHERE cp."id" = p."id"
  )
ON CONFLICT ("id") DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Role の整理（企業ユーザーも DB 上は VIEWER。企業判定は CorporateProfile 行）
-- ---------------------------------------------------------------------------

UPDATE public."Profile"
SET "role" = 'VIEWER'::public."Role"
WHERE "role"::text = 'PROVIDER';

-- ---------------------------------------------------------------------------
-- 4. Profile から移行済み列を削除
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
-- 5. Auth トリガー
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

COMMENT ON FUNCTION public.handle_new_user() IS 'auth.users 挿入時に Profile を作成。role は常に VIEWER。一般/企業の別は GeneralProfile / CorporateProfile で管理。';

-- ---------------------------------------------------------------------------
-- 6. 権限
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public."GeneralProfile" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."CorporateProfile" TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public."GeneralProfile" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."CorporateProfile" TO authenticated;

ALTER TABLE public."GeneralProfile" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."CorporateProfile" DISABLE ROW LEVEL SECURITY;

COMMIT;
