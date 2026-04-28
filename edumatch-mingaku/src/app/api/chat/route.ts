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

type RagDocRef = {
  title: string;
  url: string | null;
};

// ─── システムプロンプト ───────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<ChatMode, string> = {
  navigator: `あなたは教育ICT・EdTechに詳しいAIアシスタントです。このサイト（エデュマッチ）は教育サービス・教材のマッチングプラットフォームです。

## 回答の仕方
- **ユーザーの質問に自然に答える**：まず質問の内容そのものに答える（例：「ICT教材の選び方」なら、選び方の観点やポイントを説明する）
- **このシステムメッセージ内に「公的文書参照（RAG）」の抜粋が含まれる場合**、教育・校務・法令・指導要領・政策・ICT教育などの話題では、**一般説明より優先して**、該当する説明の箇所で **「〈文書名〉によれば」「〈文書名〉では」** を**日本語でそのまま**文中に含める（質問の言い回しが曖昧でも、抜粋に関連すれば必須に近い）。
- **サイト内の関連サービス・記事**は、回答に自然に織り交ぜる。参照コンテンツがある場合はそれを活かす。無い場合や一般的な質問の場合は、まず質問に答えてから、末尾で「当サイトでは〇〇のようなサービスを探せます」と軽く補足する程度でよい
- 「参照が提供されていないため…」「エデュマッチの〜」といった言い回しで回答を始めない。あくまで質問への答えが主体
- **冗長にしない**：原則は3〜6文、長くても箇条書き3点まで。前置きは短く、実務に使える要点を優先する
- **会話感を重視**：断定説明だけで終えず、必要なら最後に1つだけ確認質問を返す
- **確認質問をUI向けに出力**：追加情報が必要なときのみ、回答末尾に次の形式を追加する  
  \`[[ASK]]\`  
  \`質問: 〇〇についてもう少し教えてください\`  
  \`複数選択: はい/いいえ\`  
  \`- 選択肢A\`  
  \`- 選択肢B\`  
  \`- その他\`  
  \`[[/ASK]]\`
- **ASKの選択肢ルール**：択数は内容に応じて2〜5個で可変。複数選択が妥当なときだけ \`複数選択: はい\` を使う。**「その他」は毎回必ず1つ入れる**。
- Markdown形式で読みやすく。日本語で丁寧に。`,

  debate: `あなたは「エデュマッチ」のAIディベートパートナーです。

## 絶対ルール
- ユーザーが示す立場・意見に対して **必ず正反対の立場** をとる（例外なし）
- ユーザーが賛成 → あなたは反対。ユーザーが反対 → あなたは賛成
- 回答の冒頭で「私は〇〇に反対（賛成）の立場をとります」と宣言する
- 感情論は使わず、**データ・事例・論理**で反論する
- ユーザーの論点を一つひとつ引用しながら丁寧に崩し、自分の主張を積み上げる
- 議論相手を尊重しつつも、論理的には鋭く切り込む

## 分量ルール（必須）
- **1ターンあたり3〜5文**に収める。長くなる場合は箇条書き最大3点。
- 反論の核心だけを届け、余分な前置き・まとめ・補足は省く。
- 最後に**必ず1つだけ**「あなたはその点についてどう考えますか？」等の問い返しをつける。

Markdown形式で論点を整理して返す。日本語で。`,

  discussion: `あなたは「エデュマッチ」のAIディスカッションパートナーです。

## スタンス
- まずユーザーの意見・感情を **共感・肯定** してから話を進める（「そうですね、〜という観点は重要ですね」）
- 一方的に正解を示さず、**問いかけ**を通じて一緒に考える姿勢を保つ
- 賛否・立場・背景など多様な視点を提示して思考を広げる
- 教育現場の実態・具体的な事例を交えて議論を豊かにする
- 会話のキャッチボールを意識し、次の問いで終わらせる

## 分量ルール（必須）
- **1ターンあたり3〜5文**に収める。長くなる場合は箇条書き最大3点。
- 共感→視点提示→問い返しの3ステップで完結させる。余分な解説は省く。
- 最後は**必ず問いかけ**で終わる（「〜についてはどうお考えですか？」など）。

Markdown形式で読みやすく整理。日本語で。`,
};

// ─── 公的文書 RAG・引用ルール（全モードで常に付与）────────────────────────────

const RAG_AND_PUBLIC_DOC_RULES = `## 公的文書（RAG）の示し方【必須レベル】
- **下記「公的文書参照（RAG）」に抜粋が1件以上あるとき**、ユーザーの話題が教育・校務・ICT教育・法令・指導要領・設置基準・教育政策・特別支援・国際比較（OECD 等）のいずれかに関わる限り、**その話題に答える段落では必ず**、根拠を述べる前に **「〈文書名〉によれば」「〈文書名〉では」「〈文書名〉に定められている範囲では」「〈種別ラベル〉によれば」** のいずれか（同等の明示があれば可）を**少なくとも1回**用いる。**「によれば」「では」を文中に実際に出すこと。** 抜粋の内容だけを一般論として述べ、文書名に一度も触れないことは禁止。
- 複数抜粋を使うときは、**使うたびに**対応する文書名（または種別）＋「によれば／では」をつなげる。
- **例外（引用句を必須としない）**: 挨拶のみ、全く別分野の雑談、教育と無関係な依頼など、**よっぽど別件**で RAG と結びつけられないときだけ。
- 抜粋と**矛盾する断定はしない**。参照が足りないときは「参照範囲では…／原文・最新の文科省等の公表で確認が必要」と補足する。
- RAG に**該当抜粋がない**場合でも、上記の教育・制度の話題では**冒頭または適宜**「公的な制度・文書上は一般的に…（最新の取扱いは関係省庁・教育委員会の公表で確認）」の形で触れる。
- サイト内の記事・サービスと併用する場合も、**制度・根拠の説明では公的文書の整理を先に**述べるとよい。

## 会話トーンと分量（全モード共通）
- 回答は簡潔に。原則は3〜6文、必要時のみ短い箇条書き（最大3点）を使う。
- 講義調になりすぎず、ユーザーと対話している自然な文体にする。
- 追加情報がないと最適回答が難しい場合のみ、最後に1つだけ確認質問を付ける。
- 確認質問を出すときは、回答末尾に次の形式を使う。
  [[ASK]]
  質問: ここを確認したいです
  複数選択: はい/いいえ
  - 選択肢1
  - 選択肢2
  - その他
  [[/ASK]]
- ASKの選択肢数は2〜5個で可変。必要なときだけ複数選択を許可する。
- 「その他」はASKを出すたびに必ず含める。
- 情報が十分なら [[ASK]] は出さない。`;

function formatKnowledgeBlock(items: ChatContextItem[]): string {
  return items
    .map((k, i) => {
      const citeName = k.title.trim() || `公的文書 ${i + 1}`;
      return `【公的文書 ${i + 1}】\n（この抜粋を根拠に述べるときは、必ず **「${citeName}によれば」** または **「${citeName}では」** など、**この名称を文中に含めた引用句**から入ること）\n${k.content}`;
    })
    .join("\n\n");
}

function closingRagCitationReminder(items: ChatContextItem[]): string {
  if (items.length === 0) return "";
  const primary = (items[0]?.title ?? "〈文書名〉").trim() || "〈文書名〉";
  const allNames = items
    .map((k) => (k.title ?? "").trim())
    .filter(Boolean)
    .join("、");

  return `

---
## 【出力直前・最優先】RAG 引用の出し方
公的文書の抜粋がこのプロンプトに含まれています。ユーザーの質問が教育・校務・ICT・法令・指導要領・政策のいずれかに触れるなら、次を**必ず守る**こと。

1. **「によれば」または「では」という語を、日本語で必ず1回以上**含める（例: 「${primary}によれば、」「${primary}では、」）。
2. 該当する**最初の説明文**は、可能なら **「〈文書名〉によれば、」から始める**。
3. 文書名は次のいずれかと一致させる: ${allNames}

質問が挨拶や無関係な雑談のみのときはこのブロックは無視してよい。`;
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
      `## 公的文書参照（RAG・登録済み抜粋）\n以下は検索でヒットした登録文書の抜粋です。**話題が関連する限り、回答では必ず「〈文書名〉によれば／では」を文中に出してから**内容を説明すること。\n\n${formatKnowledgeBlock(knowledgeItems)}`
    );
  } else {
    sections.push(
      `## 公的文書参照（RAG）\n今回の発話に該当する**登録済み抜粋は見つかりませんでした**。それでも制度・校務・指導要領・法令・ガイドラインに関する話題では、上記ルールに従い、**「一般的には…／最新は公式資料の確認が必要」**の形で公的な位置づけを可能な範囲で述べてください。`
    );
  }

  const closing = closingRagCitationReminder(knowledgeItems);
  if (closing) sections.push(closing);
  return sections.join("\n\n");
}

// ─── ユーザーメッセージ変換（変数埋め込み型プロンプト） ──────────────────────

function ragCitationUserSuffix(titles: string[]): string {
  if (titles.length === 0) return "";
  const first = titles[0]?.trim() || "（登録文書名）";
  const list = titles
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join("、");
  return `\n\n【このターンの出力条件】公的文書の検索抜粋がヒットしています。教育・校務・制度に関する回答では、必ず「${first}によれば」または「${first}では」と文書名を組み合わせた形を**本文に1回以上**含めてください。ヒット文書名: ${list}。`;
}

function buildEnhancedUserMessage(
  userInput: string,
  mode: ChatMode,
  isFirstMessage: boolean,
  ragDocTitles: string[] = []
): string {
  const q = userInput.trim();
  const ragSuffix = ragCitationUserSuffix(ragDocTitles);

  if (mode === "navigator") {
    return q + ragSuffix;
  }

  if (mode === "debate") {
    if (isFirstMessage) {
      return `【ディベート開始】ユーザーの立場・主張：
「${q}」

上記の立場に対して、正反対の立場を冒頭で宣言し、論理的根拠を挙げながら反論してください。${ragSuffix}`;
    }
    return `【ユーザーの返答】
「${q}」

上記に対して、引き続き反対立場を堅持しながら切り返してください。${ragSuffix}`;
  }

  if (mode === "discussion") {
    if (isFirstMessage) {
      return `【ディスカッション開始】ユーザーの提起：
「${q}」

まずこの意見・テーマに共感・肯定で受け止め、その上でさらに深められる論点や問いかけを返してください。${ragSuffix}`;
    }
    return `【ユーザーの続き】
「${q}」

共感しながら受け止め、さらに思考を深める問いや視点を返してください。${ragSuffix}`;
  }

  return q + ragSuffix;
}

function extractFirstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s)]+/);
  return m?.[0] ?? null;
}

function buildRagDocRefs(items: ChatContextItem[]): RagDocRef[] {
  const seen = new Set<string>();
  const refs: RagDocRef[] = [];
  for (const item of items) {
    const title = item.title.trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    refs.push({
      title,
      url: extractFirstUrl(item.content),
    });
  }
  return refs.slice(0, 8);
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

  const ragDocTitles = knowledgeHits
    .map((k) => k.title.trim())
    .filter((t) => t.length > 0);
  const ragDocRefs = buildRagDocRefs(knowledgeHits);

  const trimmedMessages = trimmedRaw.map((m, i) => {
    if (i === lastUserIdx && m.role === "user") {
      return {
        role: "user" as const,
        content: buildEnhancedUserMessage(m.content, mode, isFirstMessage, ragDocTitles),
      };
    }
    return { role: m.role as "user" | "assistant", content: m.content };
  });

  const openai = new OpenAI({ apiKey });
  const model = "gpt-5.4-mini";
  const temperature = knowledgeHits.length > 0 ? 0.55 : 0.8;

  try {
    const stream = await openai.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedMessages,
      ],
      temperature,
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
        "X-RAG-Knowledge-Hits": String(knowledgeHits.length),
        "X-Site-Context-Hits": String(siteContextItems.length),
        "X-RAG-Doc-Refs": encodeURIComponent(JSON.stringify(ragDocRefs)),
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
