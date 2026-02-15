# どのメールアドレスにも送れるようにする（Resend ドメイン検証）

資料請求の確認メールを **ユーザー・サービス提供者など、任意のメールアドレス** に送るには、Resend で「送信元ドメイン」を検証する必要があります。  
検証しない間は、Resend にログインしているメールアドレス（例: edumatch.kanri@gmail.com）にしか送れません。

---

## やることの流れ

1. Resend でドメインを 1 つ追加する  
2. そのドメインの DNS に Resend が指定するレコードを追加する  
3. Resend で「検証」を実行する  
4. `.env.local` に `RESEND_FROM_EMAIL=送信元@検証したドメイン` を設定する  
5. アプリを再起動（または再デプロイ）する  

---

## 手順（詳細）

### 1. Resend にログイン

- https://resend.com を開く  
- ログインする  

### 2. ドメインを追加

- 左メニュー **Domains** をクリック  
- **Add Domain** をクリック  
- 送信元に使うドメインを入力する  

**使えるドメインの例**

| 種類 | 例 | 備考 |
|------|-----|------|
| 独自ドメイン | `edumatch.jp` | お名前.com や Cloudflare などで DNS を管理している場合 |
| Vercel のドメイン | `あなたのプロジェクト.vercel.app` | Vercel にデプロイしている場合、このドメインでも可 |

※ まだドメインを持っていない場合は、Vercel のデプロイ時に付与される `xxx.vercel.app` を使うのが手軽です。

### 3. DNS レコードを設定

Resend の画面に **追加すべき DNS レコード** が表示されます（TXT / MX / CNAME など）。

- **独自ドメイン**  
  ドメインの DNS 管理画面（お名前.com、Cloudflare、Route53 など）を開き、Resend が表示したレコードをそのまま追加する。  
- **Vercel のドメイン（xxx.vercel.app）**  
  Vercel のダッシュボード → プロジェクト → **Settings** → **Domains** で、そのドメインの **DNS Records** を編集し、Resend が指定したレコードを追加する。

### 4. 検証する

- Resend の Domains 画面に戻る  
- 追加したドメインの **Verify** をクリック  
- 検証が成功するまで待つ（数分〜最大 48 時間程度の場合あり）  
- ステータスが **Verified** になれば OK  

### 5. 環境変数を設定

検証したドメインの **任意のメールアドレス** を送信元にします。

**`.env.local`（ローカル開発）**

```env
RESEND_FROM_EMAIL=noreply@あなたが検証したドメイン
```

例：

- ドメインが `edumatch.jp` の場合  
  `RESEND_FROM_EMAIL=noreply@edumatch.jp`
- ドメインが `edumatch.vercel.app` の場合  
  `RESEND_FROM_EMAIL=noreply@edumatch.vercel.app`

**本番（Vercel）**

- Vercel のプロジェクト → **Settings** → **Environment Variables**  
- `RESEND_FROM_EMAIL` を追加（上と同じ値）  
- 保存後、必要なら再デプロイ  

### 6. アプリを再起動

- ローカル: `npm run dev` を一度止めてから再度実行  
- 本番: Vercel の場合は再デプロイ  

---

## これでできること

- 資料請求の「受付完了メール」を、**請求したユーザーのメールアドレス** に送れる  
- 資料請求の「依頼通知」を、**サービス提供者のメールアドレス** に送れる  
- そのほか、アプリ内で Resend を使っている箇所は、**指定した任意のメールアドレス** に送れる  

---

## エラーが出たとき（参考）

ターミナルに次のようなログが出る場合：

```
You can only send testing emails to your own email address (edumatch.kanri@gmail.com).
To send emails to other recipients, please verify a domain at resend.com/domains...
```

→ まだドメインが検証されていないか、`RESEND_FROM_EMAIL` が「検証したドメインのメールアドレス」になっていません。  
上記の手順 2〜5 をやり直し、送信元を検証済みドメインのアドレスにしてください。

公式ドキュメント: https://resend.com/docs/dashboard/domains/introduction
