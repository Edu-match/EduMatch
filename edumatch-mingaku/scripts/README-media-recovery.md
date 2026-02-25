# サービス写真が消えたときの対処（WordPress なし）

WordPress をすでに消してしまった場合、次の順で確認・対応してください。

## 1. Supabase にまだ画像が残っていないか確認する

```bash
cd edumatch-mingaku
npx tsx scripts/list-supabase-media.ts
```

- **何件か表示される** → 以前アップロードしたファイルが残っている可能性があります（次の「2」へ）。
- **0 件 or エラー** → バケットが空か、別バケット・別プロジェクトの可能性があります。

## 2. Supabase に画像が残っている場合

- **Supabase Dashboard** → **Storage** → **media** で、フォルダ構成を確認してください。
  - 例: `service-thumbnails/` やユーザーIDフォルダなど。
- パスが「サービスID」や「サービス名」と対応していれば、  
  DB の `Service.thumbnail_url` / `images` を「その Supabase の公開URL」に更新するスクリプトを書けます。  
  （どのようなパスで保存されていたか分かれば、こちらでスクリプト案を出します。）

## 3. Supabase のバックアップ（Pro プラン）

- **Supabase Pro** なら **Point in Time Recovery (PITR)** で、過去の時点の DB とストレージに戻せます。
- Dashboard → **Project Settings** → **Backups** で、バックアップの有無と復元手順を確認してください。
- ストレージの「削除前」の状態に戻せる可能性があります。

## 4. 別のバックアップがある場合

- **WordPress のバックアップ ZIP**（`wp-content/uploads` 入り）  
  → 解凍して画像だけ取り出し、管理画面やスクリプトで Supabase に再アップロード。
- **別サーバー・別ドメインに移した WordPress**  
  → その URL が分かれば、`sync-service-thumbnails-from-csv.ts` の対象 URL を差し替えて同じスクリプトで取り込めます。
- **手元のフォルダに画像だけ残っている**  
  → サービスごとにフォルダ分けしてあれば、Supabase にアップロードしてから DB の URL を更新するスクリプトを作れます。

## 5. どのバックアップもない場合

- 現状のまま、**サムネイルなし（プレースホルダー表示）**で運用。
- 新規・差し替え用の写真は、管理画面の「サービス編集」から 1 件ずつアップロードして Supabase に保存できます。

---

**まずは** `npx tsx scripts/list-supabase-media.ts` を実行し、  
「media バケットに何件あるか」「どんなパスか」を確認するのがおすすめです。  
結果（件数とパスの例）が分かれば、DB を直す具体的なスクリプト案も出せます。
