-- =============================================================================
-- manual_profile_kind に従い GeneralProfile / CorporateProfile に行を作成・更新する
-- （先に 20260415160000 でテーブル初期化＋カラム追加済みであること）
-- =============================================================================
-- 同一ユーザーが両方に残らないよう、片方に入れる直前にもう一方を削除します。
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- general → GeneralProfile（企業側の行があれば削除）
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- corporate → CorporateProfile（一般側の行があれば削除）
-- ---------------------------------------------------------------------------

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
