/**
 * CSV の「画像」列（WordPress URL）からサムネイルをダウンロードし、
 * Supabase Storage にアップロードして Service.thumbnail_url / images を更新する。
 *
 * 使い方:
 *   npx tsx scripts/sync-service-thumbnails-from-csv.ts
 *   CSV_PATH=/path/to/サービス.csv npx tsx scripts/sync-service-thumbnails-from-csv.ts
 *
 * WordPress が 403 を返す場合（ホットリンク防止等）は取得できません。
 * その場合は CLEAR_FAILED=1 で取得失敗したサービスの thumbnail_url/images を null/[] にし、
 * サイト側のプレースホルダー表示に任せられます。
 */
import { config } from "dotenv";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

// .env.local を優先して読み込む（Next プロジェクトルート）
config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "media";
const PREFIX = "service-thumbnails";

const csvPath =
  process.env.CSV_PATH ||
  path.join(process.env.HOME || "/Users/Ryo", "Downloads", "サービス.csv");

const prisma = new PrismaClient();

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key, { auth: { persistSession: false } });
}

function extractImageUrls(imageColumn: string | undefined): string[] {
  if (!imageColumn || typeof imageColumn !== "string") return [];
  return imageColumn
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s.startsWith("http"));
}

function basenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean).pop() || "image";
    return seg.replace(/[^a-zA-Z0-9._-]/g, "_");
  } catch {
    return `image_${Date.now()}.webp`;
  }
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: "https://edu-match.com/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/webp";
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

async function uploadToSupabase(
  supabase: ReturnType<typeof createClient>,
  filePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: contentType.startsWith("image/") ? contentType : "image/webp",
      upsert: true,
      cacheControl: "3600",
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

async function main() {
  if (!fs.existsSync(csvPath)) {
    console.error("CSV not found:", csvPath);
    console.error("Set CSV_PATH or place サービス.csv in ~/Downloads");
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, "utf-8");
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    bom: true,
  }) as Record<string, string>[];

  const supabase = getSupabaseAdmin();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of records) {
    const wpIdRaw = row["ID"];
    const name = (row["名前"] || "").trim();
    const imageUrls = extractImageUrls(row["画像"]);

    if (imageUrls.length === 0) {
      skipped++;
      continue;
    }

    const wpId = wpIdRaw ? parseInt(wpIdRaw, 10) : null;
    let service =
      wpId != null && !Number.isNaN(wpId)
        ? await prisma.service.findFirst({
            where: { wp_product_id: wpId },
            select: { id: true, title: true, thumbnail_url: true },
          })
        : null;
    if (!service && name) {
      service = await prisma.service.findFirst({
        where: { title: name },
        select: { id: true, title: true, thumbnail_url: true },
      });
    }

    if (!service) {
      console.warn("  [skip] No matching service:", name || wpId);
      skipped++;
      continue;
    }

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const wpUrl = imageUrls[i];
        const { buffer, contentType } = await downloadImage(wpUrl);
        const basename = basenameFromUrl(wpUrl);
        const storagePath = `${PREFIX}/${service!.id}_${i}_${basename}`;
        const publicUrl = await uploadToSupabase(supabase, storagePath, buffer, contentType);
        newUrls.push(publicUrl);
      }

      const thumbnail_url = newUrls[0] ?? null;
      const images = newUrls.length > 1 ? newUrls.slice(1) : [];

      await prisma.service.update({
        where: { id: service.id },
        data: { thumbnail_url, images },
      });

      console.log("  [ok]", service.title, `(${newUrls.length} images)`);
      updated++;
    } catch (e) {
      console.error("  [fail]", service.title, e);
      failed++;
      if (process.env.CLEAR_FAILED === "1") {
        await prisma.service.update({
          where: { id: service.id },
          data: { thumbnail_url: null, images: [] },
        });
        console.log("  [cleared] thumbnail_url/images set to null/[]");
      }
    }
  }

  console.log("\nDone. Updated:", updated, "Skipped:", skipped, "Failed:", failed);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
