/**
 * 既存のサービス・記事を整形済みデータで上書きする
 * - サービス: data/services-cleaned.csv の内容で content / description / category を更新（タイトルで照合）
 * - 記事: 本文を HTML → プレーンテキストに変換して更新
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse as parseCsv } from 'csv-parse/sync';
import { htmlToPlainText } from './lib/clean-content';

const prisma = new PrismaClient();

const EDITOR_EMAIL = 'editor@edu-match.com';
const CLEANED_CSV_PATH = path.join(process.cwd(), 'data', 'services-cleaned.csv');

async function updateServices(editorId: string) {
  if (!fs.existsSync(CLEANED_CSV_PATH)) {
    console.error('Cleaned CSV not found:', CLEANED_CSV_PATH);
    console.error('Run: npx tsx scripts/clean-services-csv.ts');
    return 0;
  }

  const fileContent = fs.readFileSync(CLEANED_CSV_PATH, 'utf-8');
  const records = parseCsv(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  let updated = 0;
  for (const record of records as Record<string, unknown>[]) {
    const title = String(record['名前'] ?? '').trim();
    if (!title) continue;

    const description = String(record['簡単な説明'] ?? '').trim();
    const content = String(record['説明'] ?? '').trim();
    const category = String(record['カテゴリー'] ?? 'その他').trim();

    const result = await prisma.service.updateMany({
      where: { provider_id: editorId, title },
      data: { description, content, category },
    });
    if (result.count > 0) updated += result.count;
  }
  return updated;
}

async function updatePosts(editorId: string) {
  const posts = await prisma.post.findMany({
    where: { provider_id: editorId },
    select: { id: true, content: true },
  });

  let updated = 0;
  for (const post of posts) {
    const cleaned = htmlToPlainText(post.content ?? '');
    if (cleaned === (post.content ?? '')) continue;

    await prisma.post.update({
      where: { id: post.id },
      data: { content: cleaned },
    });
    updated++;
  }
  return updated;
}

async function main() {
  const editor = await prisma.profile.findUnique({ where: { email: EDITOR_EMAIL } });
  if (!editor) {
    console.error('Editor profile not found (email:', EDITOR_EMAIL, '). Run migrate first.');
    process.exit(1);
  }

  console.log('Updating services from cleaned CSV...');
  const serviceCount = await updateServices(editor.id);
  console.log('  Updated services:', serviceCount);

  console.log('Updating posts (HTML → plain text)...');
  const postCount = await updatePosts(editor.id);
  console.log('  Updated posts:', postCount);

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
