/**
 * Supabaseでis_publishedを直接変更した際のキャッシュ無効化Webhookのセットアップ
 *
 * 実行: npx tsx scripts/setup-revalidate-webhook.ts
 *
 * 1. REVALIDATE_SECRETを生成して.envに追加
 * 2. Supabase SQL Editorで実行するSQLを出力
 */
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://edu-match.com";

function generateSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

function main() {
  const envPath = path.join(process.cwd(), ".env");
  const envLocalPath = path.join(process.cwd(), ".env.local");

  let targetPath = envPath;
  if (fs.existsSync(envLocalPath)) {
    targetPath = envLocalPath;
  }

  let secret = process.env.REVALIDATE_SECRET;
  let addedToEnv = false;

  if (!secret) {
    secret = generateSecret();
    const line = `\n# キャッシュ再検証（Supabaseでis_published等を直接変更した際に使用）\nREVALIDATE_SECRET="${secret}"\n`;

    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, "utf-8");
      if (content.includes("REVALIDATE_SECRET")) {
        console.log(`REVALIDATE_SECRET は既に ${path.basename(targetPath)} に設定されています。`);
        secret = content.match(/REVALIDATE_SECRET="?([^"\n]+)"?/)?.[1] ?? secret;
      } else {
        fs.appendFileSync(targetPath, line);
        addedToEnv = true;
      }
    } else {
      fs.writeFileSync(targetPath, line);
      addedToEnv = true;
    }
  }

  if (addedToEnv) {
    console.log(`✅ REVALIDATE_SECRET を ${path.basename(targetPath)} に追加しました。`);
  }

  const sql = getWebhookSql(SITE_URL, secret!);
  const sqlPath = path.join(process.cwd(), "supabase", "revalidate_webhook.sql");
  fs.mkdirSync(path.dirname(sqlPath), { recursive: true });
  fs.writeFileSync(sqlPath, sql, "utf-8");

  console.log("\n📋 以下のSQLを Supabase Dashboard → SQL Editor で実行してください:");
  console.log(`   ファイル: supabase/revalidate_webhook.sql\n`);
  console.log("---");
  console.log(sql);
  console.log("---");
  console.log("\n※ SITE_URLを変更する場合は、SQL内のURLを編集してください。");
  console.log("※ 本番環境（Vercel）に REVALIDATE_SECRET を環境変数として追加してください。");
}

function getWebhookSql(siteUrl: string, secret: string): string {
  const revalidateUrl = `${siteUrl.replace(/\/$/, "")}/api/revalidate`;
  const headers = JSON.stringify({
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  });

  return `-- pg_net拡張を有効化（Supabase DashboardのExtensionsで有効化していない場合）
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Service/Postテーブル変更時にキャッシュ再検証APIを呼ぶ関数
CREATE OR REPLACE FUNCTION public.notify_revalidate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
  tbl text;
BEGIN
  tbl := TG_TABLE_NAME;
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', tbl,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
  );

  PERFORM net.http_post(
    url := '${revalidateUrl}',
    body := payload,
    headers := '${headers}'::jsonb,
    timeout_milliseconds := 5000
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 既存トリガーを削除
DROP TRIGGER IF EXISTS revalidate_on_service_change ON public."Service";
DROP TRIGGER IF EXISTS revalidate_on_post_change ON public."Post";

-- Serviceテーブル用トリガー
CREATE TRIGGER revalidate_on_service_change
  AFTER INSERT OR UPDATE OR DELETE ON public."Service"
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_revalidate();

-- Postテーブル用トリガー
CREATE TRIGGER revalidate_on_post_change
  AFTER INSERT OR UPDATE OR DELETE ON public."Post"
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_revalidate();

COMMENT ON FUNCTION public.notify_revalidate() IS 'Service/Postテーブル変更時に /api/revalidate を呼びキャッシュを無効化する';
`;
}

main();
