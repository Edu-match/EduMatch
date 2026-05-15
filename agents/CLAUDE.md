# プロジェクトルール

このプロジェクトは3つのサブエージェント（Planner → Generator → Evaluator）による自動開発パイプラインで構築される。
基本的にユーザーからの依頼があればplannerエージェントを使用して仕様書を作成する。その後エージェント構成に則って実装を進める

## エージェント構成

```
Planner ──→ Generator ──→ Evaluator
 (企画)      (実装)        (検証)
              ↑               │
              └── 不合格時 ──┘
```

## ファイル規約




| パス | 用途 | 書き込み権限 |
|------|------|-------------|
| `/docs/spec.md` | 製品仕様書 | Planner のみ |
| `/docs/progress.md` | 実装進捗・自己評価 | Generator のみ |
| `/docs/feedback/sprint-N.md` | スプリント評価結果 | Evaluator のみ |

- **仕様書は Planner だけが書く。** Generator・Evaluator は読み取り専用。
- **進捗は Generator だけが書く。** Evaluator は読み取り専用。
- **フィードバックは Evaluator だけが書く。** Generator は読み取り専用。

## ワークフロー

### Step 1: 企画（Planner）
- ユーザーの短いプロンプトを受け取り `/docs/spec.md` を生成
- 技術的な実装詳細（DB設計、API設計、技術スタック）には踏み込まない
- 各スプリントに Evaluator がテスト可能な受け入れ基準を必ず記述する

### Step 2: 実装（Generator）
- `/docs/spec.md` と `/docs/progress.md` を読み、次のスプリントを特定
- **1回の呼び出しで1スプリントのみ実装する**
- 完了時に `/docs/progress.md` へ自己評価と引き渡し事項（起動方法、テストURL、テストシナリオ）を記録
- 前スプリントのフィードバック（`/docs/feedback/sprint-N.md`）があれば、修正を先に行う

### Step 3: 検証（Evaluator）
- `/docs/spec.md` の受け入れ基準と `/docs/progress.md` の引き渡し事項を読む
- Playwright MCP でアプリを実際に操作してテスト
- 結果を `/docs/feedback/sprint-N.md` に出力
- 不合格の場合 → Generator に戻って修正（Step 2 へ）
- 合格の場合 → 次のスプリントへ（Step 2 へ）

## 評価基準と閾値

| 基準 | 閾値 | 不合格時の扱い |
|------|------|---------------|
| 機能完全性 | 4/5 以上 | Generator に差し戻し |
| 動作安定性 | 4/5 以上 | Generator に差し戻し |
| UI/UX品質 | 3/5 以上 | Generator に差し戻し |
| エラーハンドリング | 3/5 以上 | Generator に差し戻し |
| 回帰なし | 5/5 必須 | Generator に差し戻し |

**1つでも閾値を下回ればスプリント不合格。**

## 絶対ルール

1. **責務を越境しない** - Planner は実装しない。Generator は仕様を変更しない。Evaluator はコードを修正しない。
2. **スプリント順序を守る** - Sprint 1 → 2 → 3 と順番に実装する。スキップ禁止。
3. **動作する状態を維持する** - 各スプリント完了時にアプリが正常に起動・動作すること。
4. **フィードバックを最優先で処理する** - Generator は新スプリント着手前に、前スプリントの不合格フィードバックを修正すること。
5. **起動手順を必ず記載する** - Generator は `/docs/progress.md` にアプリの起動コマンドを毎回明記する。Evaluator はそれに従って起動する。