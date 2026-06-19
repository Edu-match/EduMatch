import { prisma } from "@/lib/prisma";
import { INTEROP_PRIORITY_TOPICS } from "@/lib/interop-priority-topics";
import { saveAxis3Label, saveTopicAxis3 } from "@/lib/interop-axis-db";
import { getLocalLLM, extractJson } from "@/lib/local-llm";

const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
const DEFAULT_AXIS3_LABEL = "停滞 ↔ 活発";

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

  // フォールバック：今週の投稿数を 0..1 に正規化（活発さ）
  const fallback = async () => {
    const max = Math.max(1, ...stats.map((s) => s.week));
    let updated = 0;
    for (const s of stats) {
      await saveTopicAxis3(s.no, s.week / max);
      updated++;
    }
    await saveAxis3Label(DEFAULT_AXIS3_LABEL);
    return { label: DEFAULT_AXIS3_LABEL, updated, usedLLM: false };
  };

  const llm = getLocalLLM();
  if (!llm) return fallback();
  const { client, model } = llm;

  const lines = stats.map((s) => `${s.no}: ${s.name}（今週${s.week}件）${s.snip ? ` — ${s.snip}` : ""}`);
  const prompt =
    "井戸端会議の各トピックを縦方向（第3軸）に分布させたい。\n" +
    "今週の議論を俯瞰し、トピックの違いが最もよく現れる「対立的で直感的な1軸」を1つ提案し、各トピックを0.0〜1.0で配置する。\n" +
    "（軸の例:「停滞 ↔ 活発」「短期的 ↔ 長期的」「合意 ↔ 対立」など。必ず1つだけ選ぶ）\n" +
    '説明や前置きは書かず、JSONだけを出力する: {"label":"A ↔ B","items":[{"no":番号,"v":0.0〜1.0}]}\n\n' +
    `トピック:\n${lines.join("\n")}`;

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: "井戸端の議論を俯瞰して第3軸を設計する分類器。指定のJSONだけを出力する。" },
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
