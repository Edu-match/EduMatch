# セキュリティポリシー — エデュマッチ みんがく

## 基本方針

教育系マッチングプラットフォームとして、**オープンなサイトを維持**しながらセキュリティを確保する。
正規ユーザーを阻害しない。ブロックより検知・記録を優先する。

---

## 実装済みセキュリティ対策

### 認証・セッション管理
- Supabase SSR による HTTP-only Cookie セッション管理（CSRF 耐性）
- Google OAuth コールバックでのオープンリダイレクト防止（`safeRedirect()` 適用）
- `/api/notifications` の認証チェック（未認証 401 返却）
- ログイン API（`/api/auth/login`）のレート制限：5 回 / 15 分 / IP

### 入力・出力検証
- Prisma ORM による全 DB クエリ（SQL インジェクション耐性）
- Zod スキーマによる入力バリデーション（サービス・記事・連絡先・フォーラム等）
- ファイルアップロード：サイズ上限・拡張子・マジックバイト検証

### AI セキュリティ
- **プロンプトインジェクション検出**（`src/lib/security.ts: checkPromptInjection`）
  - 英語・日本語 16 パターンを正規表現でチェック
  - 検出時はシステムプロンプトに警告を付加（ブロックではなく記録 + 警告）
  - ユーザー入力を `<user_input>` タグで分離
- **LLM 出力スキャン**（`src/lib/security.ts: checkLlmOutput`）
  - 電話番号・メールアドレス・郵便番号・禁止フレーズを正規表現でスキャン
  - 検出時はサーバーログに記録（ストリーミング後の監査ログとして使用）
- チャット入力文字数上限：2,000 文字（API 側でも検証）

### RAG（検索拡張生成）
- pgvector + Supabase RPC `match_knowledge_chunks` による公的文書検索
- 管理者（ADMIN）のみナレッジ文書をアップロード可能
- ユーザー投稿コンテンツは RAG ベクトル DB に直接流入しない設計
- 参照文書のソース URL を DB（`KnowledgeDocument.source_url`）から取得し、回答に出典を付与

### レート制限（インメモリ Fixed Window）
| エンドポイント | 制限 |
|---|---|
| `/api/auth/login` | 5 回 / 15 分 / IP |
| `/api/community/report` | 10 回 / 時 / ユーザー |
| `/api/chat` | 30 回 / 日 / ユーザー（DB ベース） |

> **注:** インメモリ実装のため Vercel インスタンスをまたぐとリセットされる。
> 厳密な制限が必要な場合は Upstash Redis への移行を推奨。

### HTTP セキュリティヘッダー
| ヘッダー | 値 |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera/microphone/geolocation 等を無効化 |
| `Content-Security-Policy-Report-Only` | `default-src 'self'` ベース（違反をコンソールに記録） |

> CSP は現在 **report-only モード**。本番で違反が出ないことを確認してから `Content-Security-Policy` に切り替える。

---

## 脆弱性の報告

セキュリティ上の問題を発見した場合は、GitHub Issues ではなく以下の連絡先まで非公開でご報告ください。

**連絡先:** 運営チーム（ryo.18375@gmail.com）

報告内容に応じて、優先度を決めて対応します。公開バグバウンティプログラムは現時点では実施していません。

---

## 対応しないこと（オープン性の維持）

- 未ログインユーザーへの閲覧制限（サービス一覧・記事は誰でも閲覧可能）
- GET 系 API へのレート制限
- IP ブロック（正規ユーザーへの影響が大きいため）
- 通常フローでの CAPTCHA

---

## 今後の対応予定

- [ ] CSP を `report-only` から `enforce` モードへ切り替え（本番確認後）
- [ ] Upstash Redis によるインスタンス横断レート制限
- [ ] ナレッジ管理画面での登録元ソース表示（RAG データ汚染の追跡）
- [ ] プライバシーポリシーへの AI 利用方針追記（WBS ID54）
