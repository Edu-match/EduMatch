/**
 * 移行データの修正スクリプト
 * 1. サービスのカテゴリをアプリの選択肢に正規化
 * 2. 投稿者を「エデュマッチ事務局」に一括変更
 */
import { PrismaClient, Role } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const SATO_RYO_ID = '11d59125-6205-4830-b9bd-c60c6b759919';

// サービスで使用可能なカテゴリ（service-form と一致）
const SERVICE_CATEGORIES = [
  '授業管理',
  'AI学習',
  'セキュリティ',
  '教材作成',
  '校務支援',
  'コミュニケーション',
  'その他',
] as const;

/**
 * CSVのカテゴリ文字列（例: "AI活用, AI活用 > 問題演習, 学習管理システム（LMS）"）
 * をアプリの単一カテゴリに正規化する
 */
function normalizeServiceCategory(raw: string | null): string {
  if (!raw || !raw.trim()) return 'その他';
  // 最初のカテゴリのみ使用（カンマまたは " > " の前）
  const first = raw.split(/,\s*|\s*>\s*/)[0]?.trim() || raw.trim();
  const lower = first.toLowerCase();
  // キーワードでマッピング
  if (/AI|人工知能/.test(first)) return 'AI学習';
  if (/学習管理|LMS|授業管理|オンライン授業|授業支援/.test(first)) return '授業管理';
  if (/映像|問題演習|デジタル教材|教材|家庭学習/.test(first)) return '教材作成';
  if (/コミュニケーション|連絡|保護者/.test(first)) return 'コミュニケーション';
  if (/校務|事務/.test(first)) return '校務支援';
  if (/セキュリティ|安全/.test(first)) return 'セキュリティ';
  if (SERVICE_CATEGORIES.includes(first as (typeof SERVICE_CATEGORIES)[number])) return first;
  return 'その他';
}

async function fixServiceCategories() {
  console.log('Fixing Service categories...');
  const services = await prisma.service.findMany({
    where: { provider_id: SATO_RYO_ID },
    select: { id: true, category: true },
  });
  let updated = 0;
  for (const s of services) {
    const normalized = normalizeServiceCategory(s.category);
    if (normalized === s.category) continue;
    await prisma.service.update({
      where: { id: s.id },
      data: { category: normalized },
    });
    updated++;
  }
  console.log(`  Updated ${updated} / ${services.length} services.`);
}

async function ensureEditorProfile(): Promise<string> {
  const name = 'エデュマッチ事務局';
  const email = 'editor@edu-match.com';
  const existing = await prisma.profile.findUnique({ where: { email } });
  if (existing) {
    console.log(`Using existing profile: ${name} (${existing.id})`);
    return existing.id;
  }
  const id = randomUUID();
  await prisma.profile.create({
    data: {
      id,
      name,
      email,
      role: Role.PROVIDER,
      subscription_status: 'INACTIVE',
    },
  });
  console.log(`Created profile: ${name} (${id})`);
  return id;
}

async function reassignToEditor(editorId: string) {
  console.log('Reassigning imported Services and Posts to エデュマッチ事務局...');
  const serviceResult = await prisma.service.updateMany({
    where: { provider_id: SATO_RYO_ID },
    data: { provider_id: editorId },
  });
  const postResult = await prisma.post.updateMany({
    where: { provider_id: SATO_RYO_ID },
    data: { provider_id: editorId },
  });
  console.log(`  Services: ${serviceResult.count}`);
  console.log(`  Posts: ${postResult.count}`);
}

async function main() {
  await fixServiceCategories();
  const editorId = await ensureEditorProfile();
  await reassignToEditor(editorId);
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
