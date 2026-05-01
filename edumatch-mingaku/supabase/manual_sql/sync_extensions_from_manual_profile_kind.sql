-- =============================================================================
-- 【手動実行のみ】Supabase SQL Editor 用
--
-- Profile.manual_profile_kind を Table Editor で変更したあとに実行する。
-- 'general' → GeneralProfile のみ（CorporateProfile 行は削除）
-- 'corporate' → CorporateProfile のみ（GeneralProfile 行は削除）
--
-- 制約値は Profile の CHECK（'general' | 'corporate' | NULL）に従うこと。
--
-- 元ロジック: migrations/20260415170000_apply_manual_profile_kind_to_extension.sql
-- 含まないもの: DROP / TRUNCATE / Profile 本体の UPDATE・DELETE
-- =============================================================================

BEGIN;

DELETE FROM public."CorporateProfile" c
WHERE EXISTS (
  SELECT 1 FROM public."Profile" p
  WHERE p."id" = c."id" AND p."manual_profile_kind" = 'general'
);

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
WHERE p."manual_profile_kind" = 'general'
ON CONFLICT ("id") DO UPDATE SET
  "legal_name" = EXCLUDED."legal_name",
  "updated_at" = EXCLUDED."updated_at";

DELETE FROM public."GeneralProfile" g
WHERE EXISTS (
  SELECT 1 FROM public."Profile" p
  WHERE p."id" = g."id" AND p."manual_profile_kind" = 'corporate'
);

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
WHERE p."manual_profile_kind" = 'corporate'
ON CONFLICT ("id") DO UPDATE SET
  "legal_name" = EXCLUDED."legal_name",
  "updated_at" = EXCLUDED."updated_at";

COMMIT;
