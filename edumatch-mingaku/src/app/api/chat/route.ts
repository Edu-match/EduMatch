import { NextRequest } from "next/server";
import OpenAI from "openai";
import {
  getArticleContextForChat,
  getServiceContextForChat,
  searchRelevantContent,
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

// ─── システムプロンプト ───────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<ChatMode, string> = {
  navigator: `あなたは教育ICT・EdTechに詳しいAIアシスタントです。このサイト（エデュマッチ）は教育サービス・教材のマッチングプラットフォームです。

## 回答の仕方
- **ユーザーの質問に自然に答える**：まず質問の内容そのものに答える（例：「ICT教材の選び方」なら、選び方の観点やポイントを一般的に説明する）
- **サイト内の関連サービス・記事**は、回答に自然に織り交ぜる。参照コンテンツがある場合はそれを活かす。無い場合や一般的な質問の場合は、まず質問に答えてから、末尾で「当サイトでは〇〇のようなサービスを探せます」と軽く補足する程度でよい
- 「参照が提供されていないため…」「エデュマッチの〜」といった言い回しで回答を始めない。あくまで質問への答えが主体
- Markdown形式（見出し・箇条書き）で読みやすく。日本語で丁寧に。`,

  debate: `あなたは「エデュマッチ」のAIディベートパートナーです。

## 絶対ルール
- ユーザーが示す立場・意見に対して **必ず正反対の立場** をとる（例外なし）
- ユーザーが賛成 → あなたは反対。ユーザーが反対 → あなたは賛成
- 回答の冒頭で「私は〇〇に反対（賛成）の立場をとります」と宣言する
- 感情論は使わず、**データ・事例・論理**で反論する
- ユーザーの論点を一つひとつ引用しながら丁寧に崩し、自分の主張を積み上げる
- 議論相手を尊重しつつも、論理的には鋭く切り込む

Markdown形式で論点を整理して返す。日本語で。`,

  discussion: `あなたは「エデュマッチ」のAIディスカッションパートナーです。

## スタンス
- まずユーザーの意見・感情を **共感・肯定** してから話を進める（「そうですね、〜という観点は重要ですね」）
- 一方的に正解を示さず、**問いかけ**を通じて一緒に考える姿勢を保つ
- 賛否・立場・背景など多様な視点を提示して思考を広げる
- 教育現場の実態・具体的な事例を交えて議論を豊かにする
- 会話のキャッチボールを意識し、次の問いで終わらせる

Markdown形式で読みやすく整理。日本語で。`,
};

// ─── 公的文書 RAG・引用ルール（全モードで常に付与）────────────────────────────

const RAG_AND_PUBLIC_DOC_RULES = `## 公的文書・制度に関する回答ルール
- **下記「公的文書参照（RAG）」に抜粋がある場合は必ず参照**し、「〇〇（文書名・学習指導要領等）によれば…」「文科省の整理では…」「OECD の枠組みでは…」のように**根拠と文書名を明示**して述べる。一般論だけで終えない。
- 抜粋と**矛盾する断定はしない**。参照が足りないときは「参照範囲では…／原文・最新の文科省等の公表で確認が必要」と補足する。
- RAG に**該当抜粋がない**場合でも、教育政策・法令・指導要領・設置基準・国際比較の話題では、**冒頭または適宜**「公的な制度・文書上は一般的に…（最新の取扱いは関係省庁・教育委員会の公表で確認）」の形で触れる。
- サイト内の記事・サービスと併用する場合も、**制度・根拠の説明では公的文書の整理を先に**述べるとよい。`;

function formatKnowledgeBlock(items: ChatContextItem[]): string {
  return items
    .map((k, i) => `【公的文書 ${i + 1}】\n${k.content}`)
    .join("\n\n");
}

function buildSystemPrompt(
  mode: ChatMode,
  siteContextItems: ChatContextItem[],
  knowledgeItems: ChatContextItem[]
): string {
  const sections: string[] = [SYSTEM_PROMPTS[mode], RAG_AND_PUBLIC_DOC_RULES];

  if (siteContextItems.length > 0) {
    const siteText = siteContextItems
      .map((c, i) => {
        const label = c.type === "article" ? "記事" : "サービス";
        return `【${label} ${i + 1}】\n${c.content}`;
      })
      .join("\n\n");
    sections.push(
      mode === "navigator"
        ? `## サイト内の参照候補（記事・サービス）\n${siteText}`
        : `## 参照コンテンツ（記事・サービス）\n${siteText}`
    );
  }

  if (knowledgeItems.length > 0) {
    sections.push(
      `## 公的文書参照（RAG・登録済み抜粋）\n以下を**答えの根拠として優先的に引用**し、文書名・種別を明示して述べること。\n\n${formatKnowledgeBlock(knowledgeItems)}`
    );
  } else {
    sections.push(
      `## 公的文書参照（RAG）\n今回の発話に該当する**登録済み抜粋は見つかりませんでした**。それでも制度・校務・指導要領・法令・ガイドラインに関する話題では、上記ルールに従い、**「一般的には…／最新は公式資料の確認が必要」**の形で公的な位置づけを可能な範囲で述べてください。`
    );
  }

  return sections.join("\n\n");
}

// ─── ユーザーメッセージ変換（変数埋め込み型プロンプト） ──────────────────────

function buildEnhancedUserMessage(
  userInput: string,
  mode: ChatMode,
  isFirstMessage: boolean
): string {
  const q = userInput.trim();

  if (mode === "navigator") {
    return q;
  }

  if (mode === "debate") {
    if (isFirstMessage) {
      return `【ディベート開始】ユーザーの立場・主張：
「${q}」

上記の立場に対して、正反対の立場を冒頭で宣言し、論理的根拠を挙げながら反論してください。`;
    }
    return `【ユーザーの返答】
「${q}」

上記に対して、引き続き反対立場を堅持しながら切り返してください。`;
  }

  if (mode === "discussion") {
    if (isFirstMessage) {
      return `【ディスカッション開始】ユーザーの提起：
「${q}」

まずこの意見・テーマに共感・肯定で受け止め、その上でさらに深められる論点や問いかけを返してください。`;
    }
    return `【ユーザーの続き】
「${q}」

共感しながら受け止め、さらに思考を深める問いや視点を返してください。`;
  }

  return q;
}

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
  const inWindow = events.filter((e) => e.at > cutoff);
  const oldestAt = inWindow.length > 0 ? inWindow.reduce((min, e) => (e.at < min ? e.at : min), inWindow[0].at) : null;
  const resetAt = oldestAt ? new Date(new Date(oldestAt).getTime() + TWENTY_FOUR_HOURS_MS).toISOString() : null;
  return new Response(
    JSON.stringify({ used, limit: USAGE_LIMIT, resetAt }),
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

  // ─── システムプロンプト構築（サイト検索 + 公的文書 RAG は常に付与）──────────
  const explicitContexts: ChatContextItem[] = [];
  if (contextItems && contextItems.length > 0) {
    for (const item of contextItems.slice(0, 10)) {
      const ctx =
        item.type === "article"
          ? await getArticleContextForChat(item.id)
          : await getServiceContextForChat(item.id);
      if (ctx) explicitContexts.push(ctx);
    }
  }

  const lastUserMsg = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const { services: searchSvcs, articles: searchArts, knowledge: knowledgeHits } =
    await searchRelevantContent(lastUserMsg, 5);
  const searchResults = [...searchSvcs, ...searchArts].filter(
    (r) => !explicitContexts.some((e) => e.id === r.id)
  );
  const siteContextItems = [...explicitContexts, ...searchResults];

  const systemPrompt = buildSystemPrompt(mode, siteContextItems, knowledgeHits);

  // ─── ユーザーメッセージ変換（最後のユーザー発言をモード別プロンプトに変換） ─
  const trimmedRaw = messages.slice(-20);
  const isFirstMessage = trimmedRaw.filter((m) => m.role === "user").length === 1;
  const lastUserIdx = [...trimmedRaw].map((m) => m.role).lastIndexOf("user");

  const trimmedMessages = trimmedRaw.map((m, i) => {
    if (i === lastUserIdx && m.role === "user") {
      return {
        role: "user" as const,
        content: buildEnhancedUserMessage(m.content, mode, isFirstMessage),
      };
    }
    return { role: m.role as "user" | "assistant", content: m.content };
  });

  const openai = new OpenAI({ apiKey });
  const model = "gpt-5.4-mini";

  try {
    const stream = await openai.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedMessages,
      ],
      temperature: 0.8,
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
