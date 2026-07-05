---
marp: true
theme: default
paginate: true
size: 16:9
style: |
  section {
    font-family: "Hiragino Sans", "Noto Sans JP", sans-serif;
    font-size: 19px;
    padding: 34px 44px;
    background: #f7f9fc;
    color: #1a2230;
  }
  h1 { color: #1f4e79; font-size: 32px; border-bottom: 4px solid #2e86de; padding-bottom: 6px; margin-bottom: 10px; }
  h2 { color: #2e86de; font-size: 22px; margin: 6px 0; }
  table { font-size: 15.5px; width: 100%; border-collapse: collapse; }
  th { background: #1f4e79; color: #fff; padding: 6px 8px; }
  td { padding: 5px 8px; border-bottom: 1px solid #d4dbe6; }
  tr:nth-child(even) td { background: #eef3fb; }
  .sub td:first-child { padding-left: 24px; color:#44516a; }
  .total td { background: #fff3cd !important; font-weight: bold; }
  .cur { background:#d5f5e3 !important; font-weight:bold; }
  .branch { position: absolute; top: 14px; right: 26px; background: #2e86de; color:#fff; padding: 3px 12px; border-radius: 12px; font-size: 14px; }
  strong { color: #c0392b; }
  small { color: #5a6678; font-size: 13px; }
  .two { display:flex; gap:22px; }
  .two > div { flex:1; }
---

<div class="branch">branch: video-dev / main 共通</div>

# EduMatch 全コスト試算（現行構成）
## AIチャット・AI返信 = **gpt-5.2-mini** ／ その他AI = gpt-5.4 ／ 裏方 = Groq

| サービス | 小規模 100〜1,000人 | 大規模 10,000人〜 |
|---|---|---|
| Vercel（ホスティング/Cron/Functions） | $20（¥3,100） | $150〜250（¥23k〜39k） |
| Supabase（DB+pgvector/認証/Storage） | $25（¥3,900） | $150〜250（¥23k〜39k） |
| **OpenAI 合計** | **$18〜26** | **$480〜680** |
| <span>┣ AIチャット（gpt-5.2-mini）</span> | $2〜3 | $80〜100 |
| <span>┣ AI返信 フォーラム/動画（gpt-5.2-mini）</span> | $0.5〜1 | $15〜25 |
| <span>┣ web_search ツール</span> | $5〜9 | $200〜300 |
| <span>┣ 埋め込み embedding-3-large</span> | $1〜2 | $25〜35 |
| <span>┣ interop 返信/チャット（gpt-4o-mini）</span> | $1 | $25〜35 |
| <span>┗ その他AI 記事/整形/審査/要約（gpt-5.4据置）</span> | $6〜10 | $120〜200 |
| Groq（裏方バッチ：マップ接続/軸分布/関連検索） | $1〜2 | $10〜20 |
| Resend（メール） | $0〜20 | $20 |
| Google OAuth / omni-moderation | $0 | $0 |
| **合計（Stripe除く）** | **$64〜93 ≒ ¥10,000〜14,000** | **$810〜1,220 ≒ ¥125,000〜190,000** |
| Stripe（決済） | 決済額の約3.6%（従量・別枠） | 同左 |

<small>為替¥155/＄。前提：小規模MAU約300／大規模MAU約10,000。web_search発生率30%。チャット入力3,000・出力600 tok/往復。</small>

---

<div class="branch">参考：chat+返信モデルの選択差（大規模・token課金分のみ, web検索除く）</div>

# 2. GPT vs ローカルLLM（Groq）

<div class="two">
<div>

**モデル単価・特性**
| 観点 | OpenAI GPT | ローカルLLM（Groq/OSS） |
|---|---|---|
| 代表モデル | gpt-5.2-mini / gpt-5.4 | Llama-3.3-70B / Llama-3.1-8B |
| 入力 /1M | $0.25 / $2.50 | $0.59 / $0.05 |
| 出力 /1M | $2.00 / $10.0 | $0.79 / $0.08 |
| 速度 | 標準 | 非常に高速 |
| 日本語/推論 | 高 | 中〜高(70B)/低(8B) |
| Web検索 | ネイティブ統合 | 非対応(自前実装) |
| データ送信先 | OpenAI | Groq / 自社オンプレ |
| 現在の役割 | チャット/返信/記事/審査 | 裏方バッチのみ |

</div>
<div>

**chat+返信を全部このモデルにした場合の大規模月額**
<small>（入力165M・出力33M tok、web_search除く）</small>

| モデル | 月額 |
|---|---|
| gpt-5.4（変更前） | <strong>$742</strong> |
| gpt-5.2-mini（現行） | <span class="cur">$107</span> |
| gpt-4o-mini | $45 |
| Groq Llama-3.3-70B | $123 |
| Groq Llama-3.1-8B | 約 $12 |

**結論**
- gpt-5.2-mini は Groq 70B とほぼ同コストで、Web検索・日本語品質・運用の手軽さで有利。
- Groq は「高速・大量・低単価の裏方」や 8B 級の割り切り用途で効く。
- 真の自社オンプレは GPU 固定費（月 数百〜千＄）が乗り小規模では割高。

</div>
</div>
