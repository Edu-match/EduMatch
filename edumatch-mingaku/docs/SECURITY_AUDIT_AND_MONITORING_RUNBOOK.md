# Vercel 監査ログ確認手順・監視運用強化 Runbook

最終更新: 2026-04-21
対象: `edumatch-mingaku` (Vercel Project: `edu-match`)

## 1. 目的

- Vercel 上の不正アクセス兆候を早期に検知する。
- 環境変数やデプロイ設定への不審操作を追跡できる状態を維持する。
- 事案発生時に、再現性のある初動対応を行う。

## 2. 監査ログ確認手順 (定常運用)

### 2.1 確認場所

1. Vercel Dashboard にログイン
2. Team Settings -> `Activity`
3. `Search Project` で `edu-match` を選択
4. 期間は `Last 7 Days` (週次点検時) / `All Time` (インシデント調査時)

### 2.2 必須確認イベント

以下のイベントを `Filter by Event` で選択して確認する:

- `env.read`
- `env.list`
- `env.create`
- `env.update`
- `env.delete`
- `team.member.added`
- `team.member.removed`
- `deployment.created`
- `project.settings.updated`

注: UI 上でイベント名が一部異なる場合があるため、「Environment Variables」「Team」「Project Settings」「Deployments」を中心に確認する。

### 2.3 正常判定

以下をすべて満たせば「正常」:

- 想定メンバー以外の操作がない
- 深夜帯や休日など不自然な時間の機密操作がない
- `env.*` イベントが、運用変更日以外に集中していない
- 意図しない `production` デプロイがない

## 3. 監視運用強化ルール

### 3.1 アクセス制御

- Team 全メンバーで 2FA を必須化する
- Owner 権限は最小人数に制限する
- 不要メンバーは即日削除する

### 3.2 環境変数運用

- 機密値 (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` など) はローテーション可能な台帳で管理する
- `Production` と `Preview` で秘密情報を共有しない
- `NEXT_PUBLIC_*` は公開値のみを入れる (秘密情報を入れない)

### 3.3 デプロイ運用

- `main` の本番デプロイは担当者レビュー後に実施する
- 不要な Preview を定期削除する
- 緊急時に即時ロールバックできるよう、直近安定デプロイを控える

### 3.4 定期ローテーション

- 高権限キーは四半期ごとにローテーションする
- 対象例:
  - Supabase DB Password (`DATABASE_URL` / `DIRECT_URL`)
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
  - `OPENAI_API_KEY`
  - `RESEND_API_KEY`
  - `REVALIDATE_SECRET`

## 4. 週次点検チェックリスト

- [ ] Activity ログで `env.*` の不審操作がない
- [ ] Team メンバーに不要アカウントがない
- [ ] 直近 7 日の本番デプロイに想定外がない
- [ ] 期限切れ/廃止予定の API キーが残っていない
- [ ] セキュリティ関連の外部告知 (Vercel / Next.js / Supabase / Stripe) を確認した

## 5. インシデント初動手順

### 5.1 トリガー

以下のいずれかがあれば「インシデント対応」へ移行:

- 見覚えのない `env.read` / `env.list`
- 不審なメンバー追加
- 意図しない本番デプロイ
- 外部から漏えい通知を受領

### 5.2 30分以内の実施項目

1. 影響範囲の特定 (対象プロジェクト、対象期間、対象イベント)
2. 高権限シークレットの緊急ローテーション
3. 不審アカウント/トークンの失効
4. 必要に応じて本番デプロイ凍結
5. 事実ベースで時系列ログを記録

### 5.3 対外通知方針 (必要時)

- 「確認済み事実」と「未確定事項」を分けて記載する
- 推測は書かない
- 追加調査結果は追記方式で更新する

## 6. 運用担当

- 一次対応: 開発責任者
- 承認者: オーナー権限保有者
- 記録場所: 本 runbook + インシデント時の社内記録

