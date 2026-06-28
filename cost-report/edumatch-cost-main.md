---
marp: true
theme: default
paginate: true
size: 16:9
style: |
  section {
    font-family: "Hiragino Sans", "Noto Sans JP", sans-serif;
    font-size: 22px;
    padding: 40px 50px;
    background: #f7f9fc;
    color: #1a2230;
  }
  h1 { color: #1f4e79; font-size: 38px; border-bottom: 4px solid #2e86de; padding-bottom: 8px; }
  h2 { color: #2e86de; font-size: 28px; }
  table { font-size: 18px; width: 100%; border-collapse: collapse; }
  th { background: #1f4e79; color: #fff; padding: 8px 10px; }
  td { padding: 7px 10px; border-bottom: 1px solid #d4dbe6; }
  tr:nth-child(even) td { background: #eef3fb; }
  .hi { background: #fff3cd !important; font-weight: bold; }
  .branch { position: absolute; top: 18px; right: 30px; background: #2e86de; color:#fff; padding: 4px 14px; border-radius: 14px; font-size: 16px; }
  strong { color: #c0392b; }
  small { color: #5a6678; }
---

<div class="branch">branch: main</div>

# EduMatch ランニングコスト試算
## AIチャット・AIコメントを GPT-4o-mini に変更した場合

- 対象ブランチ: **main**
- 為替: ¥155/＄ ／ 集計日: 2026-06-17
- ユーザー規模: **小規模 100〜1,000人**（MAU約300）／ **大規模 10,000人〜**（MAU約10,000）
- モデレーション(omni-moderation) / Google OAuth は無料、Stripe は売上連動のため別枠

---

<div class="branch">branch: main</div>

# 利用サービス一覧

| サービス | 用途 | 課金 |
|---|---|---|
| Vercel | ホスティング(Next.js 16, 東京hnd1), Cron×5, Functions | 固定+従量 |
| Supabase | PostgreSQL + pgvector(RAG), 認証, ストレージ | プラン+従量 |
| OpenAI **gpt-4o-mini** | ★AIチャット/AI記事/フォーラムAIコメント/動画AI返信/審査 | トークン従量 |
| OpenAI text-embedding-3-large | RAG用 埋め込み | トークン従量 |
| OpenAI omni-moderation | 投稿自動審査 | 無料 |
| OpenAI web_search ツール | チャット内Web検索 | 1コール従量 |
| Groq (ローカルLLM枠) | 裏方バッチ(マップ接続/軸分布/関連検索) | トークン従量(最安) |
| Resend | メール送信(資料請求通知) | プラン |
| Stripe | 決済(Standard/Premium) | 決済額の約3.6% |
| Google OAuth | ログイン | 無料 |

---

<div class="branch">branch: main</div>

# 月額費用：GPT-4o-mini 化後の内訳

| サービス | 小規模 (100〜1,000人) | 大規模 (10,000人〜) |
|---|---|---|
| Vercel | $20 (¥3,100) | $150〜250 (¥23k〜39k) |
| Supabase | $25 (¥3,900) | $150〜250 (¥23k〜39k) |
| OpenAI (mini+埋込+web検索) | $8〜12 | $180〜230 |
| Groq | $1〜2 | $10〜20 |
| Resend | $0〜20 | $20 |
| Google OAuth | $0 | $0 |
| **合計 (Stripe除く)** | **$55〜75 / 月**<br>**≒ ¥8,500〜11,500** | **$510〜740 / 月**<br>**≒ ¥80,000〜115,000** |
| Stripe | 決済額の約3.6%(従量) | 同左 |

---

<div class="branch">branch: main</div>

# gpt-5.4 → GPT-4o-mini 比較（効果）

| 規模 | 現状 gpt-5.4 | GPT-4o-mini化 | 削減 |
|---|---|---|---|
| 小規模 100〜1,000人 | ¥12,000〜16,000 | <span class="hi">¥8,500〜11,500</span> | **約 −30%** |
| 大規模 10,000人〜 | ¥210,000〜270,000 | <span class="hi">¥80,000〜115,000</span> | **約 −60%** |

#### OpenAI部分のみの比較（コストの主因）
| 規模 | gpt-5.4 | GPT-4o-mini | 削減 |
|---|---|---|---|
| 小規模 | $35〜45 | $8〜12 | 約 −75% |
| 大規模 | $1,000〜1,200 | $180〜230 | **約 −80%** |

<small>単価前提: gpt-5.4 ≈ 入力$2.5/出力$10 ・ gpt-4o-mini = 入力$0.15/出力$0.60 (per 1M tokens)。web_searchツール料金は別途残存。</small>

---

<div class="branch">branch: main</div>

# 注記 — ブランチによる差はなし

- **main と video-dev で外部サービス・費用は同一。**
  AIルート構成・モデル指定(`gpt-5.4`×6 / `text-embedding-3-large`×6 / `omni-moderation`×1)は完全一致。
- video-dev の差分は `three.js` / `react-three-fiber` / `postprocessing`（フォーラム3D表示のクライアント側ライブラリ）の追加のみ → **外部課金ゼロ**。
- 主要前提：小規模=MAU約300・AI利用100人×4セッション×3往復／大規模=MAU約10,000・AI利用3,000人×5×3。web_search発生率30%。
- さらなる削減：web_searchを既定OFF(`OPENAI_WEB_SEARCH_ENABLED=false`) / RAGコンテキスト圧縮 / 裏方をGroq固定。
