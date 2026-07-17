# EduMatch v2 移行計画（Supabase / Vercel / GitHub 新プロジェクト化）

作成: 2026-07-17 ／ 状態: **基盤準備のみ完了・移行実行はRyoの指示待ち**

## 新プロジェクト

| 種別 | 名称 | 状態 |
|---|---|---|
| Supabase | `EduMatch-v2-Production`（ref: `uvtipyflmnlfoooeestz`、ap-northeast-1、月額$10） | ✅ 作成済み（2026-07-17） |
| Vercel | 未作成（EduMatchアカウントに新規作成予定） | ⬜ |
| GitHub | 未作成（新リポジトリ） | ⬜ |

## データ移行手順（実行時のチェックリスト）

移行元: `EduMatchPJ`（lyoesgwecpcoaylsyiys・旧本番）
移行先: `EduMatch-v2-Production`（uvtipyflmnlfoooeestz）

1. **スキーマ適用**: `prisma/schema.prisma` から DDL を生成し新DBへ適用（または旧DBの `pg_dump --schema-only` 相当をMCPで再現）
2. **auth.users の移行**: Supabase Auth のユーザーは DB テーブルコピーだけでは移行できない。
   - 方法A: Supabase CLI `supabase db dump` + auth スキーマ込みリストア（要DB接続文字列）
   - 方法B: Admin API でユーザーをエクスポート→インポート（パスワードハッシュ維持可）
   - ⚠️ `Profile.id` は `auth.users.id` と一致している前提のため、**Authユーザーを先に移行**してから public テーブルを移行する
3. **publicテーブルのデータ移行**: 依存順（親→子）で INSERT。FK順序に注意
4. **件数照合**: 移行前後で全テーブルの行数を照合（移行前に旧DBでスナップショット取得）
5. **ストレージ**: Supabase Storage のバケット（アバター画像等）があれば別途オブジェクトコピー
6. **環境変数**: 新Vercelプロジェクトに新Supabaseの URL / anon key / service role key / DATABASE_URL を設定
7. **Auth設定**: 新プロジェクトの Site URL / Redirect URLs にサブドメインを設定。Google等のOAuthプロバイダ設定を旧プロジェクトから複製
8. **切替**: DNS切替（サブドメイン）→ 動作確認 → 旧プロジェクトは当面凍結（すぐ削除しない）

## 注意事項

- 移行実行は**必ずRyoの明示的な指示後**
- 実行前に旧本番の全テーブル件数スナップショットを取り、実行後に照合する
- kaikan系（チケット申込）は7/19申込開始後にデータが増えるため、**切替直前に差分移行**が必要になる可能性が高い
