import { prisma } from "@/lib/prisma";
import { INTEROP_PRIORITY_TOPICS } from "@/lib/interop-priority-topics";
import { getAxisConfig, saveAxisConfig, saveTopicPosition } from "@/lib/interop-axis-db";
import { getLocalLLM, extractJson } from "@/lib/local-llm";

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * 日次：各トピックのコメント・返信を集約し、現在の軸に沿って2軸座標をLLMで再計算→DB保存。
 * コメントが無いトピックはスキップ（初期座標を維持）。
 *
 * 判定は安価LLMで行う。JSON抽出は寛容に（モデルによってはjson_object未対応のことがある）。
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
      await saveTopicPosition(topic.no, clamp1(Number(j.x ?? 0)), clamp1(Number(j.y ?? 0)));
      updated++;
    } catch (e) {
      console.error("[interop-axis-ai] recompute topic", topic.no, e);
      skipped++;
    }
  }
  return { updated, skipped };
}

/**
 * 週次：全トピックの議論を俯瞰し、分布がバランスよく散らばる2軸をLLMで再設計→DB保存。
 * 軸を更新したら座標も再計算する。
 */
export async function reevaluateAxisConfig(): Promise<{ changed: boolean }> {
  const llm = getLocalLLM();
  if (!llm) return { changed: false };
  const { client, model } = llm;
  const current = await getAxisConfig();

  const samples: string[] = [];
  for (const topic of INTEROP_PRIORITY_TOPICS) {
    const posts = await prisma.forumPost.findMany({
      where: {
        room_id: topic.roomId,
        is_hidden: false,
        NOT: { body: { startsWith: "[AI]" } },
      },
      orderBy: { created_at: "desc" },
      take: 2,
      select: { body: true },
    });
    if (posts.length > 0) {
      samples.push(`【${topic.category}】${posts.map((p) => p.body).join(" / ").slice(0, 150)}`);
    }
  }
  if (samples.length < 4) return { changed: false };

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "教育トピック群を2次元に分布させる軸を設計する。現状の議論内容がバランスよく四方に散らばり、対立的で直感的に分かりやすい2軸を提案する。" +
            "説明や前置きは書かず、JSONだけを出力する: {\"xLeft\":\"\",\"xRight\":\"\",\"yTop\":\"\",\"yBottom\":\"\"}。各ラベルは4〜10文字の簡潔な日本語。",
        },
        {
          role: "user",
          content:
            `現在の軸: 横[${current.xLeft} ↔ ${current.xRight}] / 縦[上:${current.yTop} 下:${current.yBottom}]\n` +
            `トピックと議論サンプル:\n${samples.join("\n").slice(0, 4000)}`,
        },
      ],
    });
    const j = extractJson<{ xLeft?: string; xRight?: string; yTop?: string; yBottom?: string }>(
      completion.choices[0]?.message?.content
    );
    if (!j) return { changed: false };
    if (j.xLeft && j.xRight && j.yTop && j.yBottom) {
      await saveAxisConfig({
        xLeft: j.xLeft.slice(0, 16),
        xRight: j.xRight.slice(0, 16),
        yTop: j.yTop.slice(0, 16),
        yBottom: j.yBottom.slice(0, 16),
      });
      await recomputeTopicPositions();
      return { changed: true };
    }
  } catch (e) {
    console.error("[interop-axis-ai] reevaluate", e);
  }
  return { changed: false };
}
