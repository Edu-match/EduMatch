import { prisma } from "@/lib/prisma";
import { INTEROP_PRIORITY_TOPICS } from "@/lib/interop-priority-topics";
import { getAxisConfig, saveAxisConfig } from "@/lib/interop-axis-db";
import { getLocalLLM, extractJson } from "@/lib/local-llm";

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * 日次：各トピックのコメント・返信を集約し、現在の軸に沿って2軸座標をLLMで再計算→DB保存。
 * （現在は2軸座標も固定運用のため未使用だが、将来の動的分布用に残す）
 */
export async function recomputeTopicPositions(): Promise<{ updated: number; skipped: number }> {
  const llm = getLocalLLM();
  if (!llm) return { updated: 0, skipped: INTEROP_PRIORITY_TOPICS.length };
  const { client, model } = llm;
  const axis = await getAxisConfig();

  let updated = 0;
  let skipped = 0;
  for (const topic of INTEROP_PRIORITY_TOPICS) {
    const posts = await prisma.forumPost.findMany({
      where: {
        room_id: topic.roomId,
        is_hidden: false,
        NOT: { body: { startsWith: "[AI]" } },
      },
      orderBy: { created_at: "desc" },
      take: 24,
      select: { body: true, replies: { select: { body: true }, take: 2 } },
    });
    if (posts.length === 0) {
      skipped++;
      continue;
    }
    const text = posts
      .map((p) => p.body + p.replies.map((r) => ` / ${r.body}`).join(""))
      .join("\n")
      .slice(0, 3000);

    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              `教育トピックを2軸で位置づける。横軸x: -1=「${axis.xLeft}」 ↔ +1=「${axis.xRight}」。` +
              `縦軸y: -1=「${axis.yBottom}」 ↔ +1=「${axis.yTop}」。` +
              `議論内容の重心がどこに寄るかを判断する。説明や前置きは書かず、JSONだけを出力する: {"x": number, "y": number}（各 -1.0〜1.0）。`,
          },
          { role: "user", content: `トピック: ${topic.category}\n投稿・返信:\n${text}` },
        ],
      });
      const j = extractJson<{ x?: number; y?: number }>(completion.choices[0]?.message?.content);
      if (!j) {
        skipped++;
        continue;
      }
      updated++;
    } catch (e) {
      console.error("[interop-axis-ai] recompute topic", topic.no, e);
      skipped++;
    }
  }
  return { updated, skipped };
}
