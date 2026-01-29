# Google OAuth ログイン設定ガイド

このドキュメントでは、Google OAuthログイン機能を有効にするための設定手順を説明します。

## Supabase「Users」とアプリの「Profile」の違い

- **Supabase の Users（Authentication > Users）**  
  メール／パスワードやGoogleで「誰がログインできるか」を管理する認証ユーザーです。ログインした人はここに必ず1件あります。

- **アプリの Profile テーブル（Table Editor > Profile）**  
  同じPostgres内の独自テーブルで、「名前・役割（閲覧者/投稿者）・メール」などを保持します。メニュー表示（記事投稿・サービス投稿の有無）や権限チェックは、このProfileの`role`を見ています。

ログイン時やOAuthコールバック時に、**Usersにいるユーザーに対応するProfileがなければ作成する**処理を入れているので、通常はどちらの方法で入ってもProfileに1件できる想定です。

「投稿者」と「閲覧者」で分けてあるので、役割の違いが分かりやすくなっています。

## 1. Google Cloud Console での設定

### 1.1 OAuth同意画面の設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）
3. **APIとサービス** > **OAuth同意画面** に移動
4. ユーザータイプを選択（**外部** を推奨）
5. アプリ情報を入力：
   - **アプリ名**: EduMatch（または任意の名前）
   - **ユーザーサポートメール**: あなたのメールアドレス
   - **デベロッパーの連絡先情報**: あなたのメールアドレス
6. **スコープ** を追加：
   - `openid`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
7. **テストユーザー** を追加（外部公開前の場合）：
   - テスト用のGoogleアカウントのメールアドレスを追加
8. **保存して次へ** をクリック

### 1.2 OAuth 2.0 クライアントIDの作成

1. **APIとサービス** > **認証情報** に移動
2. **+ 認証情報を作成** > **OAuth 2.0 クライアントID** を選択
3. **アプリケーションの種類**: **ウェブアプリケーション** を選択
4. **名前**: 任意の名前（例: "EduMatch Web Client"）
5. **承認済みの JavaScript 生成元**:
   - `http://localhost:3000`（開発環境）
   - `https://yourdomain.com`（本番環境）
6. **承認済みのリダイレクト URI**:
   - `http://localhost:3000/api/auth/callback`（開発環境）
   - `https://yourdomain.com/api/auth/callback`（本番環境）
7. **作成** をクリック
8. **クライアントID** と **クライアントシークレット** をコピー（後で使用します）

## 2. Supabase での設定

### 2.1 Google OAuthプロバイダーの有効化

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択
3. **Authentication** > **Providers** に移動
4. **Google** を探して **有効にする** をクリック
5. Google Cloud Consoleで取得した認証情報を入力：
   - **Client ID (OAuth 2.0)**: Google Cloud ConsoleのクライアントID
   - **Client Secret (OAuth 2.0)**: Google Cloud Consoleのクライアントシークレット
6. **保存** をクリック

### 2.2 メール確認の無効化（オプション）

メール確認をオフにする場合：

1. **Authentication** > **Settings** に移動
2. **Email Auth** セクションを展開
3. **Enable email confirmations** のトグルを **オフ** にする
4. **保存** をクリック

**注意**: メール確認をオフにすると、セキュリティが低下します。本番環境では慎重に検討してください。

### 2.3 リダイレクトURLの設定

1. **Authentication** > **URL Configuration** に移動
2. **Redirect URLs** に以下を追加：
   - `http://localhost:3000/api/auth/callback`（開発環境）
   - `https://yourdomain.com/api/auth/callback`（本番環境）
3. **保存** をクリック

## 3. 環境変数の設定

`.env.local` ファイルに以下を追加する必要はありません（Supabase Dashboardで設定済みのため）。

ただし、本番環境のリダイレクトURLが異なる場合は、コード内のURLを確認してください。

## 4. 動作確認

1. 開発サーバーを起動: `npm run dev`
2. ログインページ（`/login`）にアクセス
3. 「閲覧者として利用」または「投稿者として利用」を選択
4. 「ログイン」タブまたは「新規登録」タブを選択
5. **Googleでログイン** または **Googleで登録** ボタンをクリック
6. Googleアカウントでログイン
7. 正常にリダイレクトされ、ダッシュボードに遷移することを確認

## 5. トラブルシューティング

### エラー: "redirect_uri_mismatch"

- Google Cloud Consoleの「承認済みのリダイレクト URI」に正しいURLが登録されているか確認
- Supabase Dashboardの「Redirect URLs」にも同じURLが登録されているか確認

### エラー: "access_denied"

- OAuth同意画面でテストユーザーとして追加されているか確認（外部公開前の場合）
- スコープが正しく設定されているか確認

### エラー: "invalid_client"

- Google Cloud ConsoleのクライアントIDとシークレットが正しくSupabaseに設定されているか確認

### メール確認が有効になっている

- Supabase Dashboardの「Email Auth」設定で「Enable email confirmations」がオフになっているか確認

## 6. セキュリティに関する注意事項

- メール確認をオフにすると、誰でも任意のメールアドレスでアカウントを作成できる可能性があります
- 本番環境では、適切なセキュリティ対策（レート制限、CAPTCHA等）を検討してください
- OAuth 2.0のクライアントシークレットは絶対に公開しないでください
