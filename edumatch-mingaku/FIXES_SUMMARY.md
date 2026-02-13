# 修正内容まとめ

## 問題点と対応

### 1. 資料請求の確認メールが届かない

**原因**: 
- `RESEND_FROM_EMAIL` が空欄だった
- エラーログが不十分で問題が見えにくかった

**対応**:
- `.env.local` に `RESEND_FROM_EMAIL=onboarding@resend.dev` を明示的に設定
- メール送信の成功/失敗ログを詳細化
- エラー発生時の詳細情報（APIキーの有無、送信先アドレスなど）をログ出力

**確認方法**:
1. 開発サーバーを再起動してください: `npm run dev`
2. 資料請求を実行
3. ターミナルのログで以下を確認:
   - `[SUCCESS] Material request emails sent...` → メール送信成功
   - `[ERROR] Failed to send...` → エラー詳細が表示される
   - `[WARN] Skipping email sending...` → APIキーが設定されていない

**注意**:
- Resendの無料プランでは `onboarding@resend.dev` からのみ送信可能
- 本番環境では独自ドメインを検証して使用してください

---

### 2. 別住所で請求時に住所未入力でも申請できる

**原因**: 
- クライアント側とサーバー側のバリデーションが不十分だった

**対応**:
- **クライアント側** (`RequestInfoForm.tsx`):
  - 送信前に全フィールドをチェック（お名前、メール、郵便番号、都道府県、市区町村、町名・番地）
  - 未入力の場合はエラーメッセージを表示して送信を中断
  - 必須項目に赤い `*` マークを追加
  
- **サーバー側** (`request-info.ts`):
  - `useAccountAddress === false` の場合、全住所フィールドをチェック
  - 未入力があれば具体的なエラーメッセージを返す

**確認方法**:
1. **必ず開発サーバーを再起動してください**: `Ctrl+C` → `npm run dev`
2. 資料請求ページで「別の住所で請求」を選択
3. 住所フィールドを空のまま送信
4. エラーメッセージが表示されることを確認

**重要**: コード変更後は必ず開発サーバーを再起動してください。

---

### 3. 新規登録後に自動ログインされない

**原因**: 
- セッション設定のタイミングとエラーハンドリングが不十分だった

**対応**:
- **サインアップAPI** (`/api/auth/signup/route.ts`):
  - メール確認の自動スキップ処理にエラーハンドリングとログを追加
  - セッション作成の成否をログ出力
  
- **SignupForm** (`signup-form.tsx`):
  - `setSession()` のエラーハンドリングを追加
  - セッション設定後に 500ms 待機してからリダイレクト（Cookieが確実に保存されるように）
  - セッション設定失敗時はユーザーにエラーメッセージを表示

**確認方法**:
1. 開発サーバーを再起動: `npm run dev`
2. 新規登録を実行
3. 登録後、自動的にプロフィール登録ページ (`/profile/register?first=1`) にリダイレクトされることを確認
4. ログイン状態（ヘッダーにユーザー名など）を確認

**注意**:
- Supabaseのメール確認設定が有効になっている場合、サービスロールキー (`SUPABASE_SERVICE_ROLE_KEY`) が正しく設定されていることを確認してください
- ターミナルのログで `Email confirmed for user: xxx` が表示されることを確認

---

## 開発サーバーの再起動方法

```bash
# 1. Ctrl+C でサーバーを停止
# 2. 再起動
npm run dev
```

## 環境変数の確認

`.env.local` に以下が設定されていることを確認:

```env
RESEND_API_KEY=re_6CbdrJFn_9zbYN5s66CXJq8euLbnUetET
RESEND_FROM_EMAIL=onboarding@resend.dev
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## トラブルシューティング

### メールが届かない場合

1. ターミナルのログを確認
2. Resendのダッシュボード (https://resend.com/emails) でメール送信履歴を確認
3. APIキーが正しいか確認
4. 送信先メールアドレスのスパムフォルダを確認

### 別住所で請求の問題が解決しない場合

1. 開発サーバーを再起動したか確認
2. ブラウザのキャッシュをクリア（Cmd+Shift+R または Ctrl+Shift+R）
3. ブラウザの開発者ツール（F12）でコンソールエラーを確認

### 新規登録後にログインできない場合

1. ターミナルで `Email confirmed for user:` のログを確認
2. Supabaseダッシュボードで Authentication > Users を確認
3. ユーザーの `email_confirmed_at` が設定されているか確認
4. `SUPABASE_SERVICE_ROLE_KEY` が正しく設定されているか確認
