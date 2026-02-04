# 404エラーのデバッグ手順

## 現在の状況
- 環境変数: ✅ 設定済み
- コード: ✅ プッシュ済み
- ビルド: ✅ ローカルで成功

## 次の確認事項

### 1. Vercelのデプロイログを確認

1. Vercelダッシュボードを開く
2. 最新のデプロイメントをクリック
3. 以下のセクションを確認：

#### A. Buildingセクション
- ✅ `prisma generate` が実行されているか？
- ✅ `next build` が成功しているか？
- ❌ エラーメッセージが出ていないか？

#### B. Deploying/Readyセクション
- ステータスが「Ready」になっているか？

**スクリーンショットを撮って確認してください**

### 2. どのURLで404が出ているか？

以下のURLをそれぞれ試して、どれで404が出るか確認：

- [ ] `https://[your-domain].vercel.app/` （ルートページ）
- [ ] `https://[your-domain].vercel.app/articles` （記事一覧）
- [ ] `https://[your-domain].vercel.app/services` （サービス一覧）
- [ ] `https://[your-domain].vercel.app/login` （ログインページ）

**どのURLで404が出ているか教えてください**

### 3. Vercelプロジェクト設定を確認

Settings → General → Build & Development Settings:

- Framework Preset: **Next.js** になっているか？
- Build Command: `npm run build` （または空欄）
- Output Directory: `.next` （または空欄）
- Install Command: `npm install` （または空欄）

**スクリーンショットを撮って確認してください**

### 4. Function Logsを確認

Vercelダッシュボード → Deployments → 最新のデプロイ → **Runtime Logs**

エラーが出ていないか確認してください。

## よくある原因と解決策

### 原因1: ルート設定の問題

**症状**: すべてのページで404

**確認方法**:
```bash
# Vercelのデプロイログで確認
Route (app)
┌ ƒ /
├ ○ /articles
...
```

このリストが表示されているか？

**解決**: 表示されていない場合、ビルドプロセスに問題があります

### 原因2: 出力ディレクトリの問題

**症状**: ビルドは成功するが、すべてのページで404

**解決**: vercel.jsonに設定を追加（完了済み）

### 原因3: Next.js 16のルーティング変更

**症状**: 特定のページのみ404

**解決**: ルーティング設定を確認

### 原因4: Vercelのキャッシュ問題

**解決**: 
1. Deployments → 最新のデプロイ → ... → **Redeploy**
2. 「Use existing Build Cache」の**チェックを外す**
3. Redeploy

## 緊急対応: Node.jsバージョンを確認

Vercel Settings → General → Node.js Version:

- **20.x** を推奨
- 18.x でも動作するはず

変更した場合は再デプロイが必要です。

## まだ解決しない場合

以下の情報を教えてください：

1. **Vercelのデプロイログ全体**（特にBuildingセクション）
2. **404が出るURL**（例: https://xxx.vercel.app/）
3. **Runtime Logs**にエラーがあるか？
4. **ブラウザのコンソール**にエラーがあるか？（F12キーで開く）

これらの情報があれば、具体的な解決策を提案できます。
