/**
 * WooCommerce サービスCSVを整形して新しいCSVを出力する
 * - 説明・簡単な説明: HTML除去・\n を改行に・プレーンテキスト化
 * - カテゴリー: アプリの選択肢に正規化（最初のカテゴリをマッピング）
 * 出力: data/services-cleaned.csv
 */
import fs from 'fs';
import path from 'path';
import { parse as parseCsv } from 'csv-parse/sync';
import { htmlToPlainText, cleanShortText } from './lib/clean-content';
import { escapeCsvField } from './lib/csv-escape';
import { normalizeServiceCategory } from './lib/normalize-category';

const CSV_HEADERS = [
  'ID',
  'タイプ',
  'SKU',
  'GTIN, UPC, EAN, or ISBN',
  '名前',
  '公開済み',
  'オススメですか ?',
  'カタログでの表示',
  '簡単な説明',
  '説明',
  'セール価格の開始日',
  'セール価格の終了日',
  '課税ステータス',
  '税区分',
  '在庫の有無',
  '在庫',
  '在庫量わずか',
  'お取り寄せを許可する ?',
  '個別に販売しますか ?',
  '重量 (kg)',
  '長さ(cm)',
  '幅 (cm)',
  '高さ (cm)',
  'カスタマーレビューを許可しますか ?',
  '注意事項',
  'セール価格',
  '標準価格',
  'カテゴリー',
  'タグ',
  '配送クラス',
  '画像',
  'ダウンロード制限',
  'ダウンロード有効期限日',
  '親',
  'セット販売商品',
  'アップセル',
  'クロスセル',
  '外部 URL',
  'ボタンのテキスト',
  '位置',
];

function main() {
  const csvPath = process.env.CSV_PATH || '/Users/Ryo/Downloads/wc-product-export-16-2-2026-1771235326561.csv';
  const outDir = path.join(process.cwd(), 'data');
  const outPath = path.join(outDir, 'services-cleaned.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCsv(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  const rows: string[][] = [CSV_HEADERS];

  for (const record of records as Record<string, unknown>[]) {
    const shortDesc = cleanShortText(record['簡単な説明'] as string | undefined);
    const longDesc = htmlToPlainText((record['説明'] as string) ?? '');
    const category = normalizeServiceCategory((record['カテゴリー'] as string) ?? '');

    const row = CSV_HEADERS.map((h) => {
      if (h === '簡単な説明') return shortDesc;
      if (h === '説明') return longDesc;
      if (h === 'カテゴリー') return category;
      const v = record[h] as unknown;
      return v == null ? '' : String(v).trim();
    });
    rows.push(row);
  }

  const csvContent = rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, '\uFEFF' + csvContent, 'utf-8'); // BOM for Excel

  console.log('Cleaned CSV written to:', outPath);
  console.log('Rows:', rows.length - 1);
}

main();
