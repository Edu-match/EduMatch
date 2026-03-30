/**
 * セミナー・イベント一括入れ替え:
 * 1. 既存の SeminarEvent を全て削除（非表示のため削除）
 * 2. 指定JSONファイルのデータを一括投入
 *
 * 使用例: EVENT_JSON=/tmp/events_import.json npx tsx scripts/import-seminar-events.ts
 */
import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

const prisma = new PrismaClient();

type Row = {
  title: string;
  event_date: string | null;
  venue: string | null;
  company: string | null;
  external_url: string | null;
  description: string;
};

async function main() {
  const jsonPath = process.env.EVENT_JSON || "/tmp/events_import.json";
  const raw = readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(raw) as Row[];

  if (!data.length) {
    console.log("No rows to import.");
    return;
  }

  const deleted = await prisma.seminarEvent.deleteMany({});
  console.log(`Deleted ${deleted.count} existing SeminarEvent(s).`);

  const payload = data.map((r) => ({
    title: r.title,
    description: r.description ?? "",
    event_date: r.event_date ?? null,
    venue: r.venue ?? null,
    company: r.company ?? null,
    external_url: r.external_url ?? null,
  }));

  const created = await prisma.seminarEvent.createMany({
    data: payload,
    skipDuplicates: false,
  });
  console.log(`Inserted ${created.count} new SeminarEvent(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
