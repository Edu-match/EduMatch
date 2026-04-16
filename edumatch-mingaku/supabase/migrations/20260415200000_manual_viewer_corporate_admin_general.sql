-- =============================================================================
-- 手動実行用（SQL Editor）: ロールに応じて拡張テーブルを寄せる
--
-- ・Profile.role = VIEWER  → CorporateProfile のみ（同名の GeneralProfile は削除）
-- ・Profile.role = ADMIN   → GeneralProfile のみ（同名の CorporateProfile は削除）
--
-- PROVIDER ロールの行は変更しません。
-- 実行前にバックアップ推奨。本番の想定と違う場合は使わないでください。
-- （通常のプロダクトでは VIEWER は一般＝General が多いです）
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- ADMIN → GeneralProfile、CorporateProfile から除外
-- ---------------------------------------------------------------------------

DELETE FROM public."CorporateProfile" c
WHERE EXISTS (
  SELECT 1 FROM public."Profile" p
  WHERE p."id" = c."id" AND p."role"::text = 'ADMIN'
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
WHERE p."role"::text = 'ADMIN'
  AND NOT EXISTS (SELECT 1 FROM public."GeneralProfile" g WHERE g."id" = p."id")
ON CONFLICT ("id") DO UPDATE SET
  "legal_name" = EXCLUDED."legal_name",
  "updated_at" = EXCLUDED."updated_at";

UPDATE public."Profile"
SET "manual_profile_kind" = 'general'
WHERE "role"::text = 'ADMIN';

-- ---------------------------------------------------------------------------
-- VIEWER → CorporateProfile、GeneralProfile から除外
-- ---------------------------------------------------------------------------

DELETE FROM public."GeneralProfile" g
WHERE EXISTS (
  SELECT 1 FROM public."Profile" p
  WHERE p."id" = g."id" AND p."role"::text = 'VIEWER'
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
WHERE p."role"::text = 'VIEWER'
  AND NOT EXISTS (SELECT 1 FROM public."CorporateProfile" c WHERE c."id" = p."id")
ON CONFLICT ("id") DO UPDATE SET
  "legal_name" = EXCLUDED."legal_name",
  "updated_at" = EXCLUDED."updated_at";

UPDATE public."Profile"
SET "manual_profile_kind" = 'corporate'
WHERE "role"::text = 'VIEWER';

COMMIT;
