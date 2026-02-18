# 移行用データ

## サービス CSV（整形済み）

- **services-cleaned.csv**  
  WooCommerce の商品エクスポート CSV を整形したもの。  
  生成: `npx tsx scripts/clean-services-csv.ts`  
  （元ファイルは環境変数 `CSV_PATH` で指定可能。未指定時は `~/Downloads/wc-product-export-*.csv` を想定）

### 整形内容

- **説明** … HTML タグ除去・`\n` を改行に・見出し・リスト・リンクをプレーンテキスト化
- **簡単な説明** … HTML 除去・改行正規化
- **カテゴリー** … アプリの選択肢（授業管理 / AI学習 / セキュリティ / 教材作成 / 校務支援 / コミュニケーション / その他）に正規化

## 移行の流れ

1. 必要なら **CSV を整形**: `npx tsx scripts/clean-services-csv.ts`
2. **Supabase へ投入**: `npx tsx scripts/migrate-wp-data.ts`  
   - サービス: `data/services-cleaned.csv` があればそれを使用（なければ `CSV_PATH` の CSV をその場で整形して投入）
   - 記事・イベント: `POSTS_XML_PATH` / `EVENTS_XML_PATH` の XML を読み、本文を HTML → プレーンテキストに変換して投入
   - 投稿者: すべて「エデュマッチ事務局」プロフィールに紐づく

既存のサービス・記事を残したまま実行すると重複するため、再投入する場合は事前に該当データの削除が必要です。
