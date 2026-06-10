# Vercelデプロイエラーのトラブルシューティング

## エラー確認手順

### 1. 完全なビルドログを確認
1. Vercelのデプロイページで「Build Failed」のエラーをクリック
2. 「Building」のセクションを展開
3. **完全なエラーメッセージをコピー**（特に以下の部分）：
   - `Error:` で始まる行
   - `Type error:` で始まる行
   - スタックトレース全体

### 2. 環境変数の設定を確認

**Vercelダッシュボードで以下を確認：**

1. Settings → Environment Variables に移動
2. 以下の変数がすべて設定されているか確認：

```
✓ DATABASE_URL
✓ DIRECT_URL
✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_ROLE_KEY
```

**設定する値：**

```bash
# データベース接続（Supabase）※実際の値は Vercel 環境変数 / .env.local で管理（リポジトリには絶対に置かない）
DATABASE_URL="postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"

DIRECT_URL="postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Supabase認証
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_ID].supabase.co"

NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_SUPABASE_ANON_KEY]"

SUPABASE_SERVICE_ROLE_KEY="[YOUR_SUPABASE_SERVICE_ROLE_KEY]"
```

### 3. 環境変数設定後の再デプロイ

1. 環境変数を設定したら、**必ず「Production」「Preview」「Development」すべてにチェック**
2. 保存
3. Deployments → 最新のデプロイ → 右側の「...」メニュー → 「Redeploy」

## よくあるエラーと解決方法

### エラー1: "Prisma Client could not be found"
**原因:** Prisma Clientが生成されていない
**解決:** 環境変数を設定後、再デプロイ

### エラー2: "Can't reach database server"
**原因:** DATABASE_URLが設定されていないか、間違っている
**解決:** 環境変数のDATABASE_URLとDIRECT_URLを再確認

### エラー3: TypeScriptコンパイルエラー
**原因:** 型エラーが残っている
**解決:** エラーメッセージの詳細を確認し、該当ファイルを修正

### エラー4: "Module not found"
**原因:** 依存関係のインストールエラー
**解決:** package.jsonとpackage-lock.jsonをコミット後、再デプロイ

## 次のステップ

1. **環境変数を設定** → 再デプロイ
2. それでもエラーが出る場合 → **完全なビルドログをコピー**して教えてください

ビルドログの見方：
- Vercel → Deployments → 失敗したデプロイをクリック
- 「Building」セクションを展開
- すべてのログをコピー（特に赤いエラーメッセージ）
