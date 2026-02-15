This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## ⚠️ 重要: 初回セットアップ

### 1. データベーストリガーの設定（必須）

新規ユーザー登録時にProfileテーブルが自動作成されるよう、Supabaseトリガーを設定してください。

**手順:**
1. [Supabaseダッシュボード](https://supabase.com/dashboard) → プロジェクト選択 → SQL Editor
2. `supabase/migrations/20260126_create_profile_trigger.sql` の内容をコピー&ペースト
3. 「Run」をクリック

詳細は [PROFILE_FIX_GUIDE.md](./PROFILE_FIX_GUIDE.md) を参照してください。

### 2. 既存ユーザーのProfile修正（必要に応じて）

トリガー設定前に作成されたユーザーのProfileを修正：

```bash
npm run fix:profiles
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### デプロイ手順

1. **GitHubリポジトリにプッシュ**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Vercelにプロジェクトをインポート**
   - [Vercel](https://vercel.com)にアクセス
   - GitHubアカウントでログイン
   - "Add New..." → "Project" をクリック
   - GitHubリポジトリ `dev-seifukan/edumatch-mingaku` を選択
   - "Import" をクリック

3. **環境変数の設定**
   - Vercelのプロジェクト設定画面で "Environment Variables" に移動
   - 以下の環境変数を追加：
     - `NEXT_PUBLIC_SUPABASE_URL` (SupabaseプロジェクトのURL)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabaseの匿名キー)
   - 各環境（Production, Preview, Development）に設定

4. **デプロイ**
   - "Deploy" をクリック
   - ビルドが完了すると自動的にデプロイされます

### 環境変数の設定

`.env.local.example` を参考に、Vercelの環境変数設定画面で以下を設定してください：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_database_url
```

## 認証機能の設定

### Google OAuthの設定

1. **Google Cloud ConsoleでOAuth認証情報を作成**
   - [Google Cloud Console](https://console.cloud.google.com/)にアクセス
   - プロジェクトを作成または選択
   - 「APIとサービス」→「認証情報」に移動
   - 「認証情報を作成」→「OAuth 2.0 クライアント ID」を選択
   - アプリケーションの種類を「ウェブアプリケーション」に設定
   - 承認済みのリダイレクト URIに以下を追加：
     ```
     https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
     ```
   - クライアントIDとクライアントシークレットをコピー

2. **SupabaseでGoogleプロバイダーを有効化**
   - Supabaseダッシュボードにアクセス
   - 「Authentication」→「Providers」に移動
   - 「Google」を有効化
   - Google Cloud Consoleで取得したクライアントIDとシークレットを入力
   - 「Save」をクリック

3. **リダイレクトURLの設定**
   - Supabaseダッシュボードの「Authentication」→「URL Configuration」に移動
   - 「Redirect URLs」に以下を追加：
     ```
     http://localhost:3000/api/auth/callback
     https://your-domain.com/api/auth/callback
     ```

### メール認証の設定

1. **Supabaseでメール認証を有効化**
   - Supabaseダッシュボードの「Authentication」→「Providers」に移動
   - 「Email」が有効になっていることを確認

2. **メールテンプレートの設定（オプション）**
   - 「Authentication」→「Email Templates」で確認メールのテンプレートをカスタマイズ可能

### データベース設定

認証機能を使用するには、Prismaマイグレーションが適用されている必要があります：

```bash
npx prisma migrate dev
```

これにより、`Profile`テーブルが作成され、認証後のユーザー情報が自動的に保存されます。

### 注意事項

- Vercelは自動的にNext.jsを検出し、最適な設定でビルドします
- `vercel.json` でリージョンを `nrt1` (東京) に設定しています
- 環境変数は `.env.local` ファイルではなく、Vercelのダッシュボードで設定してください

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
