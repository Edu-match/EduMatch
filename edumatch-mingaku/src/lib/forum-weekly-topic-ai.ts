import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

/** お題1行を生成（40文字以内・JSON） */
export async function generateForumWeeklyTopicTitle(params: {
  roomName: string;
  roomDescription: string;
  previousTitles: string[];
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return `${params.roomName.slice(0, 20)}について`;
  }

  const openai = new OpenAI({ apiKey });
  const prev =
    params.previousTitles.length > 0
      ? `過去のお題（重複回避）:\n${params.previousTitles.slice(-8).join("\n")}`
      : "過去のお題はまだありません。";

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "教育現場の教育のひろば向けに、議論の「今週のお題」を1つだけ提案する。出力JSONは {\"title\": \"...\"} のみ。titleは40文字以内、句点で終えないでよい。",
      },
      {
        role: "user",
        content: `部屋名: ${params.roomName}\n説明: ${params.roomDescription || "（なし）"}\n${prev}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return `「${params.roomName.slice(0, 24)}」の話題`;
  try {
    const j = JSON.parse(raw) as { title?: string };
    const t = (j.title ?? "").trim();
    return t.length > 0 ? t.slice(0, 80) : `「${params.roomName.slice(0, 24)}」の話題`;
  } catch {
    return `「${params.roomName.slice(0, 24)}」の話題`;
  }
}

/** お題行を追加し、部屋の weekly_topic を同期 */
export async function appendForumRoomTopic(roomId: string, title: string) {
  const id = nanoid();
  await prisma.$transaction(async (tx) => {
    await tx.forumRoomTopic.create({
      data: {
        id,
        room_id: roomId,
        title: title.trim(),
        period_start: new Date(),
      },
    });
    await tx.forumRoom.update({
      where: { id: roomId },
      data: { weekly_topic: title.trim() },
    });
  });
  return id;
}

export async function getRecentTopicTitles(roomId: string): Promise<string[]> {
  const rows = await prisma.forumRoomTopic.findMany({
    where: { room_id: roomId },
    orderBy: { period_start: "desc" },
    take: 12,
    select: { title: true },
  });
  return rows.map((r) => r.title);
}

/** AI 週次お題: 生成して DB に追加 */
export async function createAiWeeklyTopicForRoom(roomId: string) {
  const room = await prisma.forumRoom.findUnique({
    where: { id: roomId },
    select: { name: true, description: true },
  });
  if (!room) return null;
  const previousTitles = await getRecentTopicTitles(roomId);
  const title = await generateForumWeeklyTopicTitle({
    roomName: room.name,
    roomDescription: room.description,
    previousTitles,
  });
  await appendForumRoomTopic(roomId, title);
  return title;
}
