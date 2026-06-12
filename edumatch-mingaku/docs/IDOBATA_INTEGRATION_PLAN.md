# 井戸端会議 統合・AIペルソナ計画（Interop特設の常設化）

> 2026-06-12 調査・策定。Epic A（統合）→ B（ペルソナAI）→ C（育成）→ D（3D）。

## 0. 現状整理（調査結果）

- `/interop` は bare レイアウト・`special.*` サブドメイン rewrite（`src/middleware.ts`）・2Dバブルマップ・サブカテゴリ掲示板・LIVE吹き出し・voter_key いいねで構成。
- 文言・テーマは `InteropSetting`（key-value）で既にDB管理 → 脱イベント化は設定駆動で可能。
- データは `Interop*` 系で本体 `Forum*` と完全分離。ただし `InteropTopic.room_id` でマップ玉→ `/forum/{id}` の導線は既存。
- `InteropPost` は匿名投稿・AI返信・自動モデレーション列を持つが Profile FK がない。`ForumPost` はその逆。
- AI返信は単一ボット（OpenAI gpt-4o-mini）。投稿時 after() 即時 + cron フォールバック。

## 1. 基本判断

**テーブル統合はしない。Interop 系テーブルを常設「井戸端会議」のデータ基盤に昇格させる。**

理由:
- 井戸端会議の要件（匿名OK・AI返信・モデレーション・トピック階層・マップ）を Interop 系が既に全て持つ。
- ForumPost への移植は匿名投稿/AI返信/モデレーションの大手術になり /forum を壊すリスクが高い。
- /forum は併存させ、マップ◎玉の room_id 接続で相互導線（既存挙動を維持）。

## 2. Epic A: 統合（MVP）

1. **DB**: `interop_posts.author_id uuid NULL` 追加（FK→profiles, SetNull）。ログインユーザーは身元付き投稿、匿名は従来通り。
2. **ルート**: `/idobata` を新カノニカルに（実体は /interop と同一コンポーネント）。`/interop` → `/idobata` リダイレクト。例外:
   - `special.*` サブドメインの rewrite 先は据え置き（QRコード後方互換）
   - `/interop/admin` は実体のまま
   - API ルート（`/api/interop/*`）は据え置き（cron・既存クライアント互換）
3. **ナビ**: ヘッダーに「井戸端会議」→ `/idobata`。
4. **flag**: `InteropSetting.idobata_enabled` で段階切替。

## 3. Epic B: パーソナルAIペルソナ（MVP）

> 【重要制約】ペルソナは**管理者が事前に設定・許可したユーザーのみ**有効。
> 一般ユーザー向けの自己作成・オプトインUIは実装しない（将来拡張しやすい設計は可）。
> 未公開機能としてフラグ＋管理画面からの手動登録のみで運用する。

- 新テーブル `UserAiPersona`（Profile 1:1・管理者管理）:
  `display_name / avatar_url / persona_prompt / expertise[] / values_text / allowed_topic_ids[] / reply_frequency / is_active / xp / level / stage`
- `interop_posts.persona_id uuid NULL` 追加（AI返信の発話者）。
- アバター生成: OpenAI gpt-image-1。固定ガードレール（架空の人物・実在人物/著名人に似せない・不適切内容拒否）。保存先 Supabase Storage `personas` バケット。
- 返信パイプライン: 既存 after()+cron を拡張。トピック×expertise 関連度マッチ → クールダウン付きラウンドロビン（1投稿に最大2ペルソナ、単一ファシリテーターは0件時のフォールバックに降格）。
- UI: 「AI」バッジ必須・表示名はそのまま（なりすまし防止は badge + プロフィールに「AIペルソナ」明記）。
- 登録: **管理画面（`/admin/interop/personas`）からのみ作成・編集**。対象ユーザーの選択・persona_prompt 入力・
  expertise 設定・アバター生成・有効/停止をすべて管理者が行う。一般ユーザー設定画面には一切露出しない。
- 育成（Epic C）のXPフィードバックUIも、当面は管理者レビュー画面に限定する。

## 4. Epic C: 育成（MVP）

- XP: AI返信いいね +10 / 本人承認 +5 / 修正 +3 / 却下 0（却下理由はプロンプト改善に反映）。
- レベル閾値表 Lv1-10。解放: 返信頻度上限・許可トピック数・Lv3/6/9 でアバター進化（再生成）。
- 無課金、放置減衰なし。ランキング表示のみ。目的はエンゲージメント×AI品質のループ。

## 5. Epic D: 3Dビュー（別ライン）

- React Three Fiber + drei。`next/dynamic` ssr:false。
- 軸座標(-1..1) → XZ平面、Y=活動量。玉は InstancedMesh。吹き出しは drei Html。
- WebGL 非対応/低スペックは 2D 自動フォールバック + 手動トグル。

## 6. リスクと対策

| リスク | 対策 |
|---|---|
| 印刷済みQR (special.*) | middleware rewrite 据え置き |
| cron 互換 | API/cron パスは変更しない |
| AIなりすまし | AIバッジ強制・本人同意（オプトイン）・管理画面で停止 |
| 画像生成コスト | 生成はオプトイン時+進化時のみ（~$0.02-0.07/枚）・レート制限 |
| プロンプトインジェクション | persona_prompt はサーバー側テンプレートに埋め込み、ユーザー入力はエスケープ・長さ制限 |
| 既存機能 | /forum・管理画面・cron のパス/挙動は不変更 |

## 7. マイグレーション手順（Epic A/B 分）

```sql
ALTER TABLE interop_posts ADD COLUMN author_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
-- UserAiPersona は prisma migrate で生成（Epic B 着手時）
```

環境変数: 追加なし（OPENAI_API_KEY 既存）。Epic B で `PERSONA_IMAGE_MODEL`（省略時 gpt-image-1）。
