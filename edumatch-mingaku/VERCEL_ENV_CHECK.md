# Vercel環境変数の確認手順

## 現在の404エラーについて

404エラーが発生している原因は、**環境変数が正しく設定されていない**可能性が高いです。

## 確認手順

### 1. Vercelダッシュボードで環境変数を確認

1. https://vercel.com/dashboard にアクセス
2. プロジェクト「re-edumatchmingaku-demo」を選択
3. **Settings** → **Environment Variables** に移動

### 2. 以下の5つの変数が設定されているか確認

✅ 必須の環境変数：

| 変数名 | 設定されているか？ | Environment |
|--------|-------------------|-------------|
| `DATABASE_URL` | □ | Production, Preview, Development |
| `DIRECT_URL` | □ | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL` | □ | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | □ | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | □ | Production, Preview, Development |

### 3. 環境変数の値を確認

各変数に以下の値が設定されているか確認：

```bash
DATABASE_URL=postgresql://postgres.lyoesgwecpcoaylsyiys:EduMatchpj1234@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require

DIRECT_URL=postgresql://postgres.lyoesgwecpcoaylsyiys:EduMatchpj1234@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require

NEXT_PUBLIC_SUPABASE_URL=https://lyoesgwecpcoaylsyiys.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5b2VzZ3dlY3Bjb2F5bHN5aXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTM1NTAsImV4cCI6MjA4NDM2OTU1MH0.aLr2t6wxmNrqGQ2tD_gb3a-L7vDtDmvKQuy7mSBDaP8

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5b2VzZ3dlY3Bjb2F5bHN5aXlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc5MzU1MCwiZXhwIjoyMDg0MzY5NTUwfQ.jfkaNH1lPOianfCIkqDDxTX72JUamZyEkD0t5Hc7Z78
```

### 4. 環境変数を追加する方法

**もし環境変数が設定されていない場合：**

1. **Add New** ボタンをクリック
2. 各変数名と値を入力
3. **Environment** で「Production」「Preview」「Development」すべてにチェック
4. **Save** をクリック

**重要**: すべての環境変数を追加した後、必ず再デプロイが必要です！

### 5. 再デプロイ

環境変数を設定・更新した後：

1. **Deployments** タブに移動
2. 最新のデプロイメントの右側の「**...**」メニューをクリック
3. **Redeploy** を選択
4. 確認ダイアログで **Redeploy** をクリック

### 6. デプロイメントログを確認

再デプロイ中：

1. デプロイメントをクリック
2. **Building** セクションを確認
3. エラーが出ていないか確認

成功すると：
- ✓ Building
- ✓ Deploying
- ✓ Ready

## Preview（開発）デプロイで一覧が空になる

このアプリの記事・サービス・トップのスライダーなどは **Supabase の API キーだけではなく、Postgres に接続する `DATABASE_URL` / `DIRECT_URL`（Prisma）** でデータを読みます。

**対処:**

1. Vercel の **Preview** 用に、**開発用 Supabase プロジェクト**の接続文字列を設定する（`NEXT_PUBLIC_SUPABASE_URL` の ref と同じプロジェクトの DB であること）。
   - Supabase Dashboard → **Project Settings** → **Database** → *Connection string*（URI）
   - `DATABASE_URL`: 通常は **Transaction pooler**（ポート 6543、`pgbouncer=true`）
   - `DIRECT_URL`: **Session mode** または直接接続（ポート 5432）
2. 開発用 DB に **マイグレーション適用済み**で、かつ **データが入っている**こと（本番と別プロジェクトなら空のままでは何も表示されません）。
3. 環境変数を変えたら **Redeploy**。

**画像が出ないだけ**の場合は、`next.config.ts` が `NEXT_PUBLIC_SUPABASE_URL` から Storage ホストを許可するようになっているので、Preview 用に開発用の `NEXT_PUBLIC_SUPABASE_URL` を設定して再ビルドしてください。

### DB 疎通の切り分け（`/api/health/database`）

1. Vercel の **Preview**（必要なら Production）に `HEALTH_CHECK_SECRET` を任意の長い文字列で追加する。
2. デプロイ後、ブラウザで次を開く（`プレビューURL` と `秘密` を置き換え）:
   - `https://プレビューURL/api/health/database?secret=秘密`
3. JSON の見方:
   - `ok: false` か `prisma: error` → `DATABASE_URL` / `DIRECT_URL` またはネットワークを疑う（`error` メッセージを確認）
   - `counts.services_total` などが **0** → その環境の DB に行が無い
   - **合計はあるが** `services_visible_when_logged_out` だけ **0** → `status` / `is_published` / `is_member_only` の条件で除外されている（未ログイン時）

## よくある問題

### 問題1: 環境変数を追加したのに404エラー

**原因**: 環境変数追加後に再デプロイしていない

**解決**: Deployments → 最新のデプロイ → ... → Redeploy

### 問題2: 環境変数が反映されない

**原因**: Environment（Production/Preview/Development）にチェックが入っていない

**解決**: 
1. Settings → Environment Variables
2. 各変数の右側の編集ボタンをクリック
3. すべてのEnvironmentにチェック
4. Save → Redeploy

### 問題3: ビルドは成功するが404エラー

**原因**: `NEXT_PUBLIC_*` 変数が設定されていない

**解決**: 
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
これらは必須です。必ず設定してください。

## スクリーンショット確認事項

以下のスクリーンショットを撮って確認してください：

1. ✅ Vercel Settings → Environment Variables の画面
2. ✅ 5つの環境変数がすべて表示されている
3. ✅ 各変数の「Production」「Preview」「Development」にチェックがある

## まだエラーが出る場合

以下の情報を教えてください：

1. Vercelで環境変数は設定されていますか？（はい/いいえ）
2. 再デプロイしましたか？（はい/いいえ）
3. デプロイメントログにエラーは出ていますか？
4. どのURLでエラーが出ていますか？（例: https://xxx.vercel.app/ または https://xxx.vercel.app/services）

---

**次のステップ**: 上記の手順で環境変数を設定 → 再デプロイ → 動作確認
