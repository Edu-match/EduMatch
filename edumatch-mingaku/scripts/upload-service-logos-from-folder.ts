/**
 * ローカルフォルダの画像を Supabase Storage にアップロードし、
 * 各サービスに thumbnail_url を設定する。
 *
 * 使い方:
 *   npx tsx scripts/upload-service-logos-from-folder.ts
 *   LOGOS_FOLDER=/path/to/フォルダ npx tsx scripts/upload-service-logos-from-folder.ts
 *
 * 画像がないサービスは、既存の serviceThumbnailPlaceholder により
 * サービス名がサムネイルに表示される。
 */
import { config } from "dotenv";
import fs from "fs";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "media";
const PREFIX = "service-thumbnails";

/** 画像ファイル名 → サービス名（タイトル・提供者名に含まれるキーワードのいずれかで検索） */
const IMAGE_TO_SERVICE_KEYWORDS: Record<string, string[]> = {
  "image.png": ["ワンリード", "One Read", "CROP"],
  "アシスト／欧文ロゴ_600_-_寒河江毅.jpg": ["システムASSIST", "アシスト"],
  "image 1.png": ["KAWASEMI Lite", "カワセミライト"],
  "image 2.png": ["V-Growth"],
  "terrace_logo-02_-_正膳信次.png": ["TERRACE", "テラス"],
  "aim_logo_title_ja_-_山田智彦.png": ["aim@", "エイムアット"],
  "image 3.png": ["Dr.okke", "okke"],
  "jukushiru_logo_RGB.jpg": ["塾シル"],
  "25fa93e3ce24e63effc9087b73f3945d.png": ["受験コンパス"],
  "Liew_logo.png": ["Liew", "リュウ"],
  "5a80a6c70b832e7bb86e16cc8470c09a.png": ["Kidsプログラミングラボ", "キッズプログラミング"],
  "image 4.png": ["CodeCampKIDS", "コードキャンプ"],
  "4a3adc0ba092ac643cbe81fb94283fe3_(1).jpg": ["スリーピース", "まならぶる"],
  // image_(349).png → エデュマッチロゴ（サービスではないのでスキップ）
};

const defaultFolder = path.join(
  process.env.HOME || "/Users/Ryo",
  "Downloads",
  "プライベート、シェア",
  "新エデュマッチ"
);

const logosFolder = process.env.LOGOS_FOLDER || defaultFolder;

const prisma = new PrismaClient();

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

async function findServiceByKeywords(keywords: string[]) {
  const services = await prisma.service.findMany({
    where: {
      OR: [
        ...keywords.map((kw) => ({
          title: { contains: kw, mode: "insensitive" as const },
        })),
        ...keywords.map((kw) => ({
          provider_display_name: { contains: kw, mode: "insensitive" as const },
        })),
        ...keywords.map((kw) => ({
          provider: { name: { contains: kw, mode: "insensitive" as const } },
        })),
      ].filter(Boolean),
    },
    select: { id: true, title: true, thumbnail_url: true },
    take: 1,
  });
  return services[0] ?? null;
}

async function uploadToSupabase(
  supabase: ReturnType<typeof createClient>,
  filePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const basename = path.basename(filePath).replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${PREFIX}/${Date.now()}_${basename}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: contentType.startsWith("image/")
        ? contentType
        : "image/png",
      upsert: true,
      cacheControl: "3600",
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

async function main() {
  if (!fs.existsSync(logosFolder)) {
    console.error("Folder not found:", logosFolder);
    console.error("Set LOGOS_FOLDER or use default:", defaultFolder);
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [filename, keywords] of Object.entries(IMAGE_TO_SERVICE_KEYWORDS)) {
    const filePath = path.join(logosFolder, filename);
    if (!fs.existsSync(filePath)) {
      console.warn("  [skip] File not found:", filename);
      skipped++;
      continue;
    }

    const service = await findServiceByKeywords(keywords);
    if (!service) {
      console.warn("  [skip] No matching service for:", filename, keywords);
      skipped++;
      continue;
    }

    try {
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      const contentTypes: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
      };
      const contentType = contentTypes[ext] || "image/png";

      const publicUrl = await uploadToSupabase(
        supabase,
        filePath,
        buffer,
        contentType
      );

      await prisma.service.update({
        where: { id: service.id },
        data: { thumbnail_url: publicUrl },
      });

      console.log("  [ok]", service.title, "←", filename);
      updated++;
    } catch (e) {
      console.error("  [fail]", service.title, filename, e);
      failed++;
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
