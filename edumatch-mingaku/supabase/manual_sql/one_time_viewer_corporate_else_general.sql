-- =============================================================================
-- 【手動実行のみ】Supabase SQL Editor 用（supabase db push / migrate では実行しない）
--
-- 目的（一回限りのデータ整列）:
--   - Profile.role = VIEWER  → manual_profile_kind = 'corporate' + CorporateProfile
--   - それ以外（ADMIN / PROVIDER）→ manual_profile_kind = 'general' + GeneralProfile
--
-- その後の運用:
--   - Table Editor で manual_profile_kind を 'general' | 'corporate' に変えたら
--     sync_extensions_from_manual_profile_kind.sql を実行して拡張行を揃える
--
-- 注意（アプリの判定）:
--   - effectiveIsCorporateProfile: manual_profile_kind → 拡張行 / PROVIDER（ADMIN も同じ順序）
--   - manual_profile_kind = 'general' のときは PROVIDER でも企業扱いにならない
--
-- 注意（データ）:
--   - 拡張は「どちらか一方」の想定のため、移動元側の行は DELETE される。
--     一般側だけにあった age / 所属 や、企業側だけにあった通知先メール等は
--     このスクリプトでは復元しない（必要なら事前バックアップ）。
--
-- 含まないもの: DROP / TRUNCATE / Profile・auth.users の削除
-- =============================================================================

-- 実行前プレビュー（任意: コメントを外して結果だけ確認）
-- SELECT "id", "email", "role"::text, "manual_profile_kind"
-- FROM public."Profile"
-- ORDER BY "role"::text, "email";

BEGIN;

-- 1) 手動種別をロールで一括設定（今回の特例）
UPDATE public."Profile"
SET "manual_profile_kind" = 'corporate'
WHERE "role"::text = 'VIEWER';

UPDATE public."Profile"
SET "manual_profile_kind" = 'general'
WHERE "role"::text <> 'VIEWER';

-- 2) manual_profile_kind に従い拡張テーブルを同期
--    （migrations/20260415170000_apply_manual_profile_kind_to_extension.sql と同じ）

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
