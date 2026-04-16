-- =============================================================================
-- 修復用（SQL Editor）: 旧バッチ「全 VIEWER → CorporateProfile」実行後の巻き戻し
--
-- 対象: Profile.role = VIEWER のユーザー
--  1) CorporateProfile 行を削除
--  2) GeneralProfile が無ければ作成（legal_name は Profile.name）
--  3) manual_profile_kind を 'general' に揃える
--
-- 影響しないもの:
--  - ADMIN / PROVIDER
--  - VIEWER でも Table Editor で意図的に別状態にしている場合は、実行前にバックアップし
--    必要なら WHERE を絞る（例: manual_profile_kind = 'corporate' の行だけ等）
-- =============================================================================

BEGIN;

-- 1) VIEWER の CorporateProfile を削除（誤バッチで付いた行を除去）
DELETE FROM public."CorporateProfile" c
WHERE EXISTS (
  SELECT 1 FROM public."Profile" p
  WHERE p."id" = c."id" AND p."role"::text = 'VIEWER'
);

-- 2) VIEWER で GeneralProfile が無いユーザーに一般拡張を付与
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
WHERE p."role"::text = 'VIEWER'
  AND NOT EXISTS (SELECT 1 FROM public."GeneralProfile" g WHERE g."id" = p."id")
ON CONFLICT ("id") DO UPDATE SET
  "legal_name" = EXCLUDED."legal_name",
  "updated_at" = EXCLUDED."updated_at";

-- 3) VIEWER の手動種別を一般に統一
UPDATE public."Profile"
SET "manual_profile_kind" = 'general'
WHERE "role"::text = 'VIEWER';

COMMIT;
