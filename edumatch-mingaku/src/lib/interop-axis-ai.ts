import { prisma } from "@/lib/prisma";
import { INTEROP_PRIORITY_TOPICS } from "@/lib/interop-priority-topics";
import { getAxisConfig, saveAxisConfig, saveTopicPosition, saveAxis3Label, saveTopicAxis3 } from "@/lib/interop-axis-db";
import { getLocalLLM, extractJson } from "@/lib/local-llm";

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
const DEFAULT_AXIS3_LABEL = "巡回待ち";

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
 * 週次：井戸端の議論を俯瞰し、3Dビューの「第3軸（高さ）」を設計する。
 *   - 第3軸の意味（label）をローカルLLM（Gemma）に推測させる
 *   - 各トピックを 0.0〜1.0 で第3軸上に配置する
 * 2軸（X/Z 平面）は固定なので触らない。動的に分布させるのは第3軸だけ。
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
    } catch { /* 取得失敗時は件数0・断片なしで続行 */ }
    stats.push({ no: t.no, name: t.category, week, snip });
  }

  const fallback = async () => {
    let updated = 0;
    for (const s of stats) { await saveTopicAxis3(s.no, 0.5); updated++; }
    await saveAxis3Label(DEFAULT_AXIS3_LABEL);
    return { label: DEFAULT_AXIS3_LABEL, updated, usedLLM: false };
  };

  const llm = getLocalLLM();
  if (!llm) return fallback();
  const { client, model } = llm;

  const lines = stats.map((s) => `${s.no}: ${s.name}（今週${s.week}件）${s.snip ? ` — ${s.snip}` : ""}`);
  const system =
    "あなたは教育政策・教育思想の分析家です。教育のひろばの議論全体を俯瞰し、" +
    "トピック群を最もよく説明する『第3の分析軸』を1本だけ設計します。\n" +
    "## 軸の要件\n" +
    "- 教育の論点として意味のある『概念的な対立軸』であること。\n" +
    "- 両極は対になる名詞句で、各2〜7文字。\n" +
    "- 一方が良く他方が悪い、という価値判断を含めない。\n" +
    "## 禁止\n" +
    "- 『停滞↔活発』『人気』など活発さの軸。\n" +
    "- 『良い↔悪い』『新しい↔古い』のような曖昧な対比。\n" +
    "## 配置\n" +
    "- 各トピックを軸上に 0.0〜1.0 で配置。中央(0.5)に寄せすぎず散らす。\n" +
    '出力はJSONのみ: {"label":"左極 ↔ 右極","items":[{"no":番号,"v":0.0〜1.0}]}';
  const prompt = `今週の井戸端トピック一覧:\n${lines.join("\n")}\n\n第3軸を1本設計し、全トピックを配置してJSONで返してください。`;

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.5,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
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
