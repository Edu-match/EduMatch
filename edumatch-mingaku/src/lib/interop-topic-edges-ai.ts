import { prisma } from "@/lib/prisma";
import { INTEROP_PRIORITY_TOPICS } from "@/lib/interop-priority-topics";
import { saveTopicEdges } from "@/lib/interop-axis-db";
import { getLocalLLM, extractJson } from "@/lib/local-llm";

/**
 * 玉同士の「内容ベース」ノード接続を軽量LLMで生成して保存する（GPT を使うまでもない判定）。
 * 全トピックを1回の呼び出しでまとめて関連付ける（安く速い）。
 * テーブル未作成・LLM未設定なら 0 件保存（マップ側は従来の幾何接続にフォールバック）。
 */
export async function recomputeTopicEdges(): Promise<{ edges: number; skipped?: boolean }> {
  const llm = getLocalLLM();
  if (!llm) return { edges: 0, skipped: true };
  const { client, model } = llm;

  // 各トピックを「番号: 名前 — 直近投稿の断片」に圧縮
  const lines: string[] = [];
  for (const t of INTEROP_PRIORITY_TOPICS) {
    let snip = "";
    try {
      const posts = await prisma.forumPost.findMany({
        where: { room_id: t.roomId, is_hidden: false, NOT: { body: { startsWith: "[AI]" } } },
        orderBy: { created_at: "desc" },
        take: 3,
        select: { body: true },
      });
      snip = posts.map((p) => p.body).join(" / ").slice(0, 160);
    } catch {
      /* 投稿取得失敗時は名前だけで関連付ける */
    }
    lines.push(`${t.no}: ${t.category}${snip ? ` — ${snip}` : ""}`);
  }

  const prompt =
    `次の教育トピック一覧から、内容的に強く関連する組だけを選ぶ。\n` +
    `各行は「番号: 名前 — 最近の投稿」形式。テーマ・議論内容の近さで判断する。\n` +
    `説明や前置きは書かず、JSON配列だけを出力する: [{"a":番号,"b":番号}]\n` +
    `関連が薄い組は含めない。1トピックあたり最大3組、全体で最大40組。\n\n` +
    `トピック:\n${lines.join("\n")}`;

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: "教育トピックの関連グラフを作る分類器。指定のJSON配列だけを出力する。" },
        { role: "user", content: prompt },
      ],
    });
    const arr = extractJson<Array<{ a?: number; b?: number }>>(completion.choices[0]?.message?.content);
    if (!Array.isArray(arr)) return { edges: 0 };
    const valid = new Set(INTEROP_PRIORITY_TOPICS.map((t) => t.no));
    const edges = arr
      .map((e) => ({ a: Number(e.a), b: Number(e.b) }))
      .filter((e) => valid.has(e.a) && valid.has(e.b) && e.a !== e.b);
    await saveTopicEdges(edges);
    return { edges: edges.length };
  } catch (e) {
    console.error("[interop-topic-edges-ai]", e);
    return { edges: 0 };
  }
}
