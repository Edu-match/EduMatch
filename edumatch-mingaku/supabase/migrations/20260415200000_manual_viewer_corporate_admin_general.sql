-- =============================================================================
-- 手動実行用（SQL Editor）: ADMIN のみ GeneralProfile に寄せる
--
-- VIEWER は新規登録時にアプリが GeneralProfile を作成するため、
-- ロールだけで VIEWER を CorporateProfile に移す処理は行いません。
-- （旧版に VIEWER→Corporate が含まれていた場合は
--  20260415201000_repair_viewer_after_bad_corporate_batch.sql で修復）
--
-- PROVIDER ロールの行は変更しません。
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

COMMIT;
