import { NextRequest } from "next/server";
import OpenAI from "openai";
import {
  getArticleContextForChat,
  getServiceContextForChat,
  type ChatContextItem,
} from "@/app/_actions/chat-context";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 直近24時間の利用回数上限（全チャット共通） */
const USAGE_LIMIT = 30;

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type ChatUsageEvent = { at: string };

function getCutoff24h(): string {
  return new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();
}

function parseEvents(raw: unknown): ChatUsageEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is ChatUsageEvent =>
      e != null && typeof e === "object" && typeof (e as ChatUsageEvent).at === "string"
  );
}

function countInWindow(events: ChatUsageEvent[], cutoff: string): number {
  return events.filter((e) => e.at > cutoff).length;
}

type MessageRole = "user" | "assistant";

type ChatMode = "navigator" | "debate" | "discussion";

type RequestBody = {
  messages: { role: MessageRole; content: string }[];
  contextItems?: { id: string; type: "article" | "service" }[];
  mode?: ChatMode;
};

const SYSTEM_PROMPTS: Record<ChatMode, string> = {
  navigator: `あなたは「エデュマッチ」の AIアシスタントです。教育 ICT・EdTech に関する一般的な質問・案内に日本語で丁寧に答えてください。回答はMarkdown形式で構造化してください。`,

  debate: `あなたは「エデュマッチ」の AIアシスタントです。ディベートモードで、ユーザーが示す賛成・反対の立場に応じて議論を行ってください。
ユーザーの立場と理由を踏まえ、多角的な視点で論点を整理し、根拠を示しながら議論を深めてください。回答は日本語で丁寧に、Markdown形式で構造化してください。`,

  discussion: `あなたは「エデュマッチ」の AIアシスタントです。ディスカッションモードで、ユーザーが提起するテーマや論点について深く議論してください。
教育的な観点から多様な視点を提示し、論点を整理・掘り下げながら建設的な議論を進めてください。回答は日本語で丁寧に、Markdown形式で構造化してください。`,
};

const SYSTEM_WITH_CONTEXT = (mode: ChatMode) => {
  const base = SYSTEM_PROMPTS[mode];
  return `${base}

以下に提供されるコンテンツ情報を参照して回答に活用してください。コンテンツに記載されていない情報については「このコンテンツには該当する情報が含まれていません」と補足してください。

--- 参照コンテンツ ---
`;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: "ログインが必要です", used: 0, limit: USAGE_LIMIT }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { chat_usage_events: true },
  });
  const events = parseEvents(profile?.chat_usage_events ?? null);
  const cutoff = getCutoff24h();
  const used = countInWindow(events, cutoff);
  return new Response(
    JSON.stringify({ used, limit: USAGE_LIMIT }),
    { headers: { "Content-Type": "application/json" } }
  );
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: "会員登録（ログイン）が必要です。" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, contextItems, mode: bodyMode } = body;
  const mode: ChatMode = bodyMode && ["navigator", "debate", "discussion"].includes(bodyMode) ? bodyMode : "navigator";

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Messages are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cutoff = getCutoff24h();
  const nowIso = new Date().toISOString();

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { chat_usage_events: true },
  });
  const events = parseEvents(profile?.chat_usage_events ?? null);
  const used = countInWindow(events, cutoff);
  if (used >= USAGE_LIMIT) {
    return new Response(
      JSON.stringify({
        error: `利用回数（直近24時間で${USAGE_LIMIT}回）に達しました。しばらく経ってからご利用ください。`,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const pruned = events.filter((e) => e.at > cutoff);
  const updated = [...pruned, { at: nowIso }];
  await prisma.profile.update({
    where: { id: user.id },
    data: { chat_usage_events: updated as Prisma.InputJsonValue },
  });

  let systemPrompt = SYSTEM_PROMPTS[mode];

  if (contextItems && contextItems.length > 0) {
    const contexts: ChatContextItem[] = [];
    for (const item of contextItems.slice(0, 10)) {
      const ctx =
        item.type === "article"
          ? await getArticleContextForChat(item.id)
          : await getServiceContextForChat(item.id);
      if (ctx) contexts.push(ctx);
    }

    if (contexts.length > 0) {
      const contextText = contexts
        .map(
          (c, i) =>
            `【${c.type === "article" ? "記事" : "サービス"} ${i + 1}】\n${c.content}`
        )
        .join("\n\n");
      systemPrompt = SYSTEM_WITH_CONTEXT(mode) + contextText;
    }
  }

  const openai = new OpenAI({ apiKey });
  const model = "gpt-5.2-chat-latest";

  const trimmedMessages = messages.slice(-20).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  try {
    const stream = await openai.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedMessages,
      ],
      temperature: 0.7,
      max_completion_tokens: 2048,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    const message =
      error instanceof Error ? error.message : "AI response failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
