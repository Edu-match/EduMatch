# WordPress インポートといいね数の引き継ぎ

## いいね数（favorite_count）の引き継ぎ

- **Post** テーブルに **`wp_post_id`** カラムを追加しています（WordPress の post ID）。
- 既存の記事に `wp_post_id` を設定しておくと、WordPress から再インポートする際に「同一記事」としてマッチできます。
- **引き継ぎの考え方**: 再インポート時には **title / content / 日付 だけを更新**し、**favorite_count は更新しない**ようにすれば、前回のいいね数をそのまま残せます。

### 運用例

1. 初回: `scripts/migrate-wp-data.ts` で WordPress の記事を Post に投入（このとき `wp_post_id` が保存されます）。
2. ユーザーがいいねを付ける → `favorite_count` が増える。
3. 再度 WordPress の XML で記事を更新したい場合:
   - **既存の Post を「wp_post_id で検索して title / content / updated_at のみ UPDATE」する**スクリプトを使う。
   - そのとき **favorite_count は UPDATE に含めない**ことで、いいね数を引き継げます。

標準の `migrate-wp-data.ts` は「新規 create」のみです。再インポートで上書きする場合は、`wp_post_id` で既存を検索し、`favorite_count` を除く項目だけ更新する処理を別スクリプトで実装してください。

---

## 運営情報（サイト更新）用テーブル SiteUpdate

- **SiteUpdate** は「運営記事・サイト更新情報」専用テーブルです。
- WordPress の投稿を **運営情報として** 取り込みたい場合は、**Post ではなく SiteUpdate** に投入してください。

### インポート手順

```bash
# 1. マイグレーション実行（Supabase / Prisma で SiteUpdate テーブルを作成）
# 2. WordPress XML を SiteUpdate に投入
npx tsx scripts/import-wordpress-to-site-updates.ts /path/to/WordPress.2026-02-17.xml
```

- 同じ XML を再度実行しても、**wp_post_id で upsert** するため重複しません（既存は更新、新規のみ作成）。
- トップの「運営記事（サイト更新情報）」は、**SiteUpdate にレコードがあればそちらを表示**し、なければ従来どおり Post の最新記事を表示します。
