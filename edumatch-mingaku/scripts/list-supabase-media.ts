/**
 * Supabase Storage の media バケット内のオブジェクト一覧を表示する。
 * 「前は Supabase に入れてた」場合、ここにファイルが残っていないか確認できる。
 *
 * 使い方: npx tsx scripts/list-supabase-media.ts
 */
import { config } from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const BUCKET = "media";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data: rootFiles, error } = await supabase.storage.from(BUCKET).list("", { limit: 500 });

  if (error) {
    console.error("Storage 取得エラー:", error.message);
    process.exit(1);
  }

  if (!rootFiles?.length) {
    console.log("media バケットにはフォルダ・ファイルがありません。");
    return;
  }

  const total: { path: string; size?: number }[] = [];
  for (const item of rootFiles) {
    if (item.metadata?.size != null) {
      total.push({ path: item.name, size: item.metadata.size });
    } else {
      const { data: sub } = await supabase.storage.from(BUCKET).list(item.name, { limit: 1000 });
      if (sub?.length) {
        for (const f of sub) {
          const size = (f as { metadata?: { size?: number } }).metadata?.size;
          if (f.name) total.push({ path: `${item.name}/${f.name}`, size });
        }
      }
    }
  }

  console.log(`media バケット: ${total.length} 件のオブジェクト\n`);
  total.slice(0, 80).forEach((f) => console.log(`  ${f.path} ${f.size != null ? `(${Math.round(f.size / 1024)}KB)` : ""}`));
  if (total.length > 80) console.log(`  ... 他 ${total.length - 80} 件`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
