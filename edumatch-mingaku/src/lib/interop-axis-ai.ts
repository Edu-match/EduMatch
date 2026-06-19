import { prisma } from "@/lib/prisma";
import { INTEROP_PRIORITY_TOPICS } from "@/lib/interop-priority-topics";
import { saveAxis3Label, saveTopicAxis3 } from "@/lib/interop-axis-db";
import { getLocalLLM, extractJson } from "@/lib/local-llm";

const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
// 第3軸の意味は週次Gemmaが設計する。LLM未設定/失敗時のみの暫定ラベル（活発さは“玉の大きさ”で表すため軸には使わない）。
const DEFAULT_AXIS3_LABEL = "巡回待ち";

/**
 * 週次：井戸端の議論を俯瞰し、3Dビューの「第3軸（高さ）」を設計する。
 *   - 第3軸の意味（label）をローカルLLM（Gemma）に推測させる
 *   - 各トピックを 0.0〜1.0 で第3軸上に配置する
 * 2軸（X/Z 平面）は固定なので触らない。動的に分布させるのは第3軸だけ。
 *
 * LLM 未設定・失敗時は「今週の投稿数（＝活発さ）」を正規化したフォールバックを使う。
 */
export async function recomputeAxis3(): Promise<{ label: string; updated: number; usedLLM: boolean }> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stats: { no: number; name: string; week: number; snip: string }[] = [];
  for (const t of INTEROP_PRIORITY_TOPICS) {
    let week = 0;
    let snip = "";
    try {
      week = await prisma.forumPost.count({
        where: { room_id: t.roomId, is_hidden: false, created_at: { gte: since }, NOT: { body: { startsWith: "[AI]" } } },
      });
      const posts = await prisma.forumPost.findMany({
        where: { room_id: t.roomId, is_hidden: false, NOT: { body: { startsWith: "[AI]" } } },
        orderBy: { created_at: "desc" },
        take: 3,
        select: { body: true },
      });
      snip = posts.map((p) => p.body).join(" / ").slice(0, 140);
    } catch {
      /* 取得失敗時は件数0・断片なしで続行 */
    }
    stats.push({ no: t.no, name: t.category, week, snip });
  }

  // フォールバック：Gemma未設定/失敗時。活発さ（投稿数）は“玉の大きさ”で表すので軸には使わない。
  // 意味づけが無い状態なので中立（0.5＝フラット）に置き、ラベルも暫定にする。
  const fallback = async () => {
    let updated = 0;
    for (const s of stats) {
      await saveTopicAxis3(s.no, 0.5);
      updated++;
    }
    await saveAxis3Label(DEFAULT_AXIS3_LABEL);
    return { label: DEFAULT_AXIS3_LABEL, updated, usedLLM: false };
  };

  const llm = getLocalLLM();
  if (!llm) return fallback();
  const { client, model } = llm;

  const lines = stats.map((s) => `${s.no}: ${s.name}（今週${s.week}件）${s.snip ? ` — ${s.snip}` : ""}`);

  // 第3軸の設計ルール（システムプロンプト）。陳腐・主観的な対比を禁じ、
  // 教育言説に根ざした“分析的な対立軸”を強制する。
  const system =
    "あなたは教育政策・教育思想の分析家です。井戸端会議の議論全体を俯瞰し、" +
    "トピック群を最もよく説明する『第3の分析軸』を1本だけ設計します。\n" +
    "## 軸の要件\n" +
    "- 教育の論点として意味のある“概念的な対立軸”であること（思想・立場・価値観の対立）。\n" +
    "- 両極は対になる名詞句で、各2〜7文字。並列構造をそろえる（例: 『個の尊重 ↔ 全体最適』『現場知 ↔ 制度知』『習得 ↔ 探究』『自律 ↔ 管理』）。\n" +
    "- 一方が良く他方が悪い、という価値判断を含めない（中立な対立軸）。\n" +
    "## 禁止（陳腐・無意味なので使わない）\n" +
    "- 『停滞↔活発』『盛り上がり』『人気』など“活発さ・件数”の軸（それは別途、玉の大きさで表す）。\n" +
    "- 『良い↔悪い』『重要↔些末』『新しい↔古い』『伝統的↔進歩的』のような月並みで曖昧な対比。\n" +
    "- 比喩的・詩的な言い回し。あくまで分析的・端的に。\n" +
    "## 配置\n" +
    "- 各トピックを軸上に 0.0（左極side）〜1.0（右極side）で配置。中央(0.5)に寄せすぎず、対立がはっきり出るよう散らす。\n" +
    "出力は説明を一切付けず、次のJSONのみ: " +
    '{"label":"左極 ↔ 右極","items":[{"no":番号,"v":0.0〜1.0}]}';
  const prompt = `今週の井戸端トピック一覧（番号: 名称（件数） — 直近の発言抜粋）:\n${lines.join("\n")}\n\n上記を踏まえ、第3軸を1本設計し、全トピックを配置してJSONで返してください。`;

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.5,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
    const j = extractJson<{ label?: string; items?: Array<{ no?: number; v?: number }> }>(
      completion.choices[0]?.message?.content
    );
    if (!j || !Array.isArray(j.items)) return fallback();
    const valid = new Set(INTEROP_PRIORITY_TOPICS.map((t) => t.no));
    let updated = 0;
    for (const it of j.items) {
      const no = Number(it.no);
      if (!valid.has(no)) continue;
      await saveTopicAxis3(no, clamp01(Number(it.v)));
      updated++;
    }
    if (updated === 0) return fallback();
    const label = j.label && j.label.trim() ? j.label.trim().slice(0, 24) : DEFAULT_AXIS3_LABEL;
    await saveAxis3Label(label);
    return { label, updated, usedLLM: true };
  } catch (e) {
    console.error("[interop-axis-ai] recomputeAxis3", e);
    return fallback();
  }
}
