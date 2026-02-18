/**
 * WordPress / WooCommerce データを Supabase（Prisma）へ移行
 *
 * 前提:
 * 1. サービス: 先に scripts/clean-services-csv.ts で整形した CSV を生成する
 *    → data/services-cleaned.csv を読み込む（無い場合は指定パスのCSVをその場で整形）
 * 2. 記事・イベント: XML の content を HTML → プレーンテキストに変換して投入
 * 3. 投稿者: すべて「エデュマッチ事務局」プロフィールに紐づける
 */
import { PrismaClient, PublishStatus, Role } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse as parseCsv } from 'csv-parse/sync';
import { XMLParser } from 'fast-xml-parser';
import { randomUUID } from 'crypto';
import {
  htmlToPlainText,
  cleanShortText,
  extractImageUrlsFromHtml,
  wordpressHtmlToContentWithImages,
} from './lib/clean-content';
import { normalizeServiceCategory } from './lib/normalize-category';

const prisma = new PrismaClient();

const EDITOR_NAME = 'エデュマッチ事務局';
const EDITOR_EMAIL = 'editor@edu-match.com';

const DEFAULT_CSV_PATH = '/Users/Ryo/Downloads/wc-product-export-16-2-2026-1771235326561.csv';
const CLEANED_CSV_PATH = path.join(process.cwd(), 'data', 'services-cleaned.csv');
const POSTS_XML_PATH = '/Users/Ryo/Downloads/WordPress.2026-02-16 (3).xml';
const EVENTS_XML_PATH = '/Users/Ryo/Downloads/WordPress.2026-02-16 (1).xml';

async function ensureEditorProfile(): Promise<string> {
  const existing = await prisma.profile.findUnique({ where: { email: EDITOR_EMAIL } });
  if (existing) return existing.id;
  const id = randomUUID();
  await prisma.profile.create({
    data: {
      id,
      name: EDITOR_NAME,
      email: EDITOR_EMAIL,
      role: Role.PROVIDER,
      subscription_status: 'INACTIVE',
    },
  });
  console.log(`Created profile: ${EDITOR_NAME} (${id})`);
  return id;
}

async function migrateServices(providerId: string) {
  console.log('Migrating services...');

  let records: Record<string, string>[];
  let csvPath: string;

  if (fs.existsSync(CLEANED_CSV_PATH)) {
    csvPath = CLEANED_CSV_PATH;
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    records = parseCsv(fileContent, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });
    console.log('Using cleaned CSV:', csvPath);
  } else {
    csvPath = process.env.CSV_PATH || DEFAULT_CSV_PATH;
    if (!fs.existsSync(csvPath)) {
      console.error('CSV not found. Run: npx tsx scripts/clean-services-csv.ts');
      console.error('Or set CSV_PATH to your WooCommerce export CSV.');
      return;
    }
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    records = parseCsv(fileContent, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });
    console.log('Using raw CSV (cleaning in memory):', csvPath);
  }

  const isCleaned = csvPath === CLEANED_CSV_PATH;

  for (const record of records) {
    const title = (record['名前'] || '無題のサービス').trim();
    const description = isCleaned
      ? (record['簡単な説明']?.trim() ?? '')
      : cleanShortText(record['簡単な説明']);
    const content = isCleaned
      ? (record['説明']?.trim() ?? '')
      : htmlToPlainText(record['説明'] ?? '');
    const category = normalizeServiceCategory(record['カテゴリー'] ?? '');

    const images = record['画像'] ? record['画像'].split(',').map((url: string) => url.trim()).filter(Boolean) : [];
    const thumbnail_url = images.length > 0 ? images[0] : null;
    const additional_images = images.length > 1 ? images.slice(1) : [];

    const youtubeMatch = content.match(/https?:\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w-]+)/);
    const youtube_url = youtubeMatch ? youtubeMatch[0] : null;

    // タグ: CSVの「タグ」列をカンマ/スペース区切りで配列に（CSVと一致させる）
    const tagsRaw = (record['タグ'] ?? '').trim();
    const tags = tagsRaw
      ? tagsRaw.split(/[,，\s]+/).map((t: string) => t.trim()).filter(Boolean)
      : [];

    try {
      await prisma.service.create({
        data: {
          provider_id: providerId,
          title,
          description,
          content,
          thumbnail_url,
          images: additional_images,
          youtube_url,
          category,
          tags,
          price_info: record['標準価格']?.trim() || record['セール価格']?.trim() || 'お問い合わせください',
          is_published: record['公開済み'] === '1',
          status: record['公開済み'] === '1' ? PublishStatus.APPROVED : PublishStatus.DRAFT,
        },
      });
      console.log('  Created:', title);
    } catch (error) {
      console.error('  Failed:', title, error);
    }
  }
}

async function migratePosts(providerId: string, xmlPath: string, type: 'post' | 'seminar_event') {
  console.log(`Migrating ${type}s from: ${xmlPath}`);
  if (!fs.existsSync(xmlPath)) {
    console.warn('  XML not found, skip.');
    return;
  }

  const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const jsonObj = parser.parse(xmlContent);
  const items = jsonObj.rss?.channel?.item;
  if (!items) {
    console.warn('  No items in XML.');
    return;
  }

  const itemList = Array.isArray(items) ? items : [items];

  for (const item of itemList) {
    if (item['wp:post_type'] !== type) continue;
    const status = item['wp:status'];
    if (status === 'inherit' || status === 'trash') continue;

    const rawContent = item['content:encoded'] ?? '';

    // カテゴリ: WordPress の <category domain="category"> の CDATA（1件目を使用）
    let categoryLabel = type === 'seminar_event' ? 'セミナー・イベント' : '未分類';
    const rawCategories = item.category;
    if (rawCategories) {
      const cats = Array.isArray(rawCategories) ? rawCategories : [rawCategories];
      for (const c of cats) {
        const domain = c['@_domain'] ?? c.domain;
        const label = (c['#text'] ?? c['_'] ?? c).toString?.() ?? String(c);
        if (domain === 'category' && label && typeof label === 'string') {
          categoryLabel = label.trim();
          break;
        }
      }
    }

    // タグ: WordPress の <category domain="post_tag"> の CDATA を配列に
    const tags: string[] = [];
    if (rawCategories) {
      const cats = Array.isArray(rawCategories) ? rawCategories : [rawCategories];
      for (const c of cats) {
        const domain = c['@_domain'] ?? c.domain;
        const label = (c['#text'] ?? c['_'] ?? c).toString?.() ?? String(c);
        if (domain === 'post_tag' && label && typeof label === 'string') {
          const t = label.trim();
          if (t) tags.push(t);
        }
      }
    }

    // 画像: 本文から抽出。1枚目をサムネ、残りを images
    const imageUrls = extractImageUrlsFromHtml(rawContent);
    const thumbnail_url = imageUrls.length > 0 ? imageUrls[0] : null;
    const images = imageUrls.length > 1 ? imageUrls.slice(1) : [];

    // 本文: 画像をURL行として残す変換
    const content = wordpressHtmlToContentWithImages(rawContent);
    const summary = cleanShortText(item.description ?? '');

    const wpPostId = item['wp:post_id'] != null ? parseInt(String(item['wp:post_id']), 10) : undefined;
    const validWpPostId = wpPostId != null && !Number.isNaN(wpPostId) ? wpPostId : undefined;

    try {
      await prisma.post.create({
        data: {
          provider_id: providerId,
          title: (item.title ?? '無題の記事').trim(),
          content,
          summary,
          thumbnail_url,
          images,
          tags,
          category: categoryLabel,
          is_published: status === 'publish',
          status: status === 'publish' ? PublishStatus.APPROVED : PublishStatus.DRAFT,
          created_at: new Date(item.pubDate),
          updated_at: new Date(item.pubDate),
          ...(validWpPostId != null && { wp_post_id: validWpPostId }),
        },
      });
      console.log('  Created:', item.title);
    } catch (error) {
      console.error('  Failed:', item.title, error);
    }
  }
}

async function main() {
  const providerId = await ensureEditorProfile();

  await migrateServices(providerId);

  const postsPath = process.env.POSTS_XML_PATH || POSTS_XML_PATH;
  const eventsPath = process.env.EVENTS_XML_PATH || EVENTS_XML_PATH;
  await migratePosts(providerId, postsPath, 'post');
  await migratePosts(providerId, eventsPath, 'seminar_event');

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
