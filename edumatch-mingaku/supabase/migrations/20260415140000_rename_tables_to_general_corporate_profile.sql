-- =============================================================================
-- 旧テーブル名（GeneralUser / ServiceBusiness）から新名（GeneralProfile / CorporateProfile）へリネーム
-- 既に 20260415120000 の旧版を実行済みの DB 向け。未作成の環境では不要です。
-- Supabase SQL Editor で 1 トランザクションとして実行してください。
-- =============================================================================

BEGIN;

ALTER TABLE IF EXISTS public."GeneralUser" RENAME TO "GeneralProfile";
ALTER TABLE IF EXISTS public."ServiceBusiness" RENAME TO "CorporateProfile";

COMMENT ON TABLE public."GeneralProfile" IS '一般ユーザー向け属性（SNS・マッチング等）。auth.users / Profile と 1:1。';
COMMENT ON TABLE public."CorporateProfile" IS '企業ユーザー向け属性（資料請求通知・事業者住所等）。Profile と 1:1。';

COMMIT;
