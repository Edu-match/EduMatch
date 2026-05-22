# Google Analytics 4（GA4）

## コード側（済）

- `src/components/analytics/google-analytics.tsx` … `beforeInteractive` で gtag を **初期 HTML** に出力
- `src/components/analytics/google-analytics-page-view.tsx` … App Router の画面遷移時に `page_view` を送信
- 環境変数 `NEXT_PUBLIC_GA_MEASUREMENT_ID` が設定されているときのみタグを読み込む
- CSP（report-only）に Google Analytics / Tag Manager 用ドメインを追加（`next.config.ts`）

> **注意**: 管理画面の測定 ID と Vercel の `NEXT_PUBLIC_GA_MEASUREMENT_ID` は **同じ `G-...` である必要**があります。本番 HTML に別 ID が出ていないか、デプロイ後にページソースで `gtag('config'` を確認してください。

## あなたが行う作業

### 1. GA4 プロパティとデータストリームを作成

1. [Google Analytics](https://analytics.google.com/) にログイン
2. **管理** → **プロパティを作成**（タイムゾーン: 日本）
3. **データストリーム** → **ウェブ** を追加
   - 本番 URL: `https://edu-match.com`（Preview 用に別ストリームを作る場合はその URL）
4. 表示される **測定 ID**（`G-XXXXXXXXXX`）を控える

### 2. Vercel に環境変数を設定

| 変数名 | 値 | Environment |
|--------|-----|-------------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | **Production**（Preview で計測する場合は Preview も） |

- ローカルで試す場合: `edumatch-mingaku/.env.local` に同じ変数を追加
- 未設定のときはタグは読み込まれない（開発中の誤計測を防ぐ）

### 3. デプロイして動作確認

1. 本番（または Preview）を再デプロイ
2. GA4 → **レポート** → **リアルタイム** を開く
3. サイトを開き、自分のアクセスが表示されるか確認
4. 広告ブロッカーはオフにして試す

### 4. プライバシー（運用）

- プライバシーポリシーに GA 利用の記載を検討
- 必要に応じて Cookie 同意 UI を検討
- 個人を特定できる ID を GA の `user_id` に送らない

## カスタムイベント（任意・今後）

重要な操作を計測する場合はクライアントコンポーネントから:

```tsx
// window.gtag が読み込まれた後
window.gtag?.("event", "event_name", { key: "value" });
```
