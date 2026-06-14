import OpenAI from "openai";

export type CommunityModerationKind = "comment" | "room" | "topic";

const KIND_LABEL: Record<CommunityModerationKind, string> = {
  comment: "コメント",
  room: "ルーム",
  topic: "話題・テーマ",
};

/** トーン分類。違法ではないが「建設的でない/キツい」表現を警告表示するための区分。 */
export type ToneFlag = "ok" | "negative" | "non_constructive" | "harsh";

export const TONE_LABEL: Record<Exclude<ToneFlag, "ok">, string> = {
  negative: "ネガティブ",
  non_constructive: "非建設的な否定",
  harsh: "キツい言い方",
};

const TONE_SET: ReadonlySet<string> = new Set<ToneFlag>([
  "ok",
  "negative",
  "non_constructive",
  "harsh",
]);

export type CommunityModerationOutcome = {
  allowed: boolean;
  slackAlert: boolean;
  slackSummaryJa: string;
  source: "moderation" | "gpt" | "error";
  /** 掲載は可だが警告表示すべきトーン（"ok" 以外でバッジ表示＋Slack通知） */
  toneFlag: ToneFlag;
  /** トーン判定の理由（80字以内・UIツールチップ/Slack用） */
  toneReason: string;
};

function topScoringCategory(scores: object | undefined): string {
  if (!scores) return "unknown";
  let max = 0;
  let name = "";
  for (const [k, v] of Object.entries(scores)) {
    if (typeof v !== "number") continue;
    if (v > max) {
      max = v;
      name = k;
    }
  }
  return max > 0 ? `${name} ${max.toFixed(3)}` : "—";
}

const GPT_MODEL = "gpt-5.4";

const GPT_SYSTEM = `あなたは日本の教育関係者向けコミュニティ（学習塾・学校・ICT等）の投稿審査アシスタントです。
ユーザーから JSON だけを返してください。キーは次の5つ固定です:
- "allowed": boolean  … 掲載してよい内容なら true。攻撃・侮辱・差別・性的に不適切・未成年への害・違法行為の助長・深刻なハラスメント・明らかに教育コミュニティにそぐわない悪意は false。
- "slack_alert": boolean … 運営が目を通すべきなら true。次のいずれかで true: (1) allowed が false、(2) スパム・明らかな宣伝・教育と無関係なテーマでコミュニティの質を損ねる可能性、(3) グレーで判断が難しいが議題として不適切な可能性。健全な教育議論なら false。
- "summary_ja": string … 80文字以内の日本語。運営通知用の要約。
- "tone": "ok" | "negative" | "non_constructive" | "harsh" … 投稿のトーン。違法ではないが配慮が要る表現を区別する。
    - "ok": 健全。建設的な批判・前向きな議論。
    - "negative": あまりにも後ろ向き・悲観的で場の空気を下げる。
    - "non_constructive": 代案や根拠のない、ただの否定・揚げ足取り。
    - "harsh": キツい言い方・見下し・棘のある物言い（罵倒未満だが受け手が傷つきうる）。
    迷ったら "ok"。健全な反対意見・政策批判は "ok"。
- "tone_reason": string … 80文字以内。tone が "ok" 以外のときだけ、その理由を日本語で簡潔に。"ok" なら空文字 ""。

方針: 健全な批判や政策議論は allowed true / tone "ok"。個人や団体への罵倒・脅し・ヘイトは allowed false。`;

function isToneFlag(v: unknown): v is ToneFlag {
  return typeof v === "string" && TONE_SET.has(v);
}

function parseGptJson(raw: string): {
  allowed: boolean;
  slack_alert: boolean;
  summary_ja: string;
  tone: ToneFlag;
  tone_reason: string;
} | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const allowed = o.allowed === true;
    const slack_alert = o.slack_alert === true;
    const summary_ja =
      typeof o.summary_ja === "string" ? o.summary_ja.slice(0, 200) : "";
    const tone: ToneFlag = isToneFlag(o.tone) ? o.tone : "ok";
    const tone_reason =
      tone !== "ok" && typeof o.tone_reason === "string" ? o.tone_reason.slice(0, 200) : "";
    return { allowed, slack_alert, summary_ja, tone, tone_reason };
  } catch {
    return null;
  }
}

async function runGptPolicyCheck(
  openai: OpenAI,
  text: string,
  kind: CommunityModerationKind
): Promise<Pick<CommunityModerationOutcome, "allowed" | "slackAlert" | "slackSummaryJa" | "source" | "toneFlag" | "toneReason">> {
  const userMsg = `種別: ${KIND_LABEL[kind]}
---
次の投稿を審査してください。

${text}`;

  try {
    const completion = await openai.chat.completions.create({
      model: GPT_MODEL,
      temperature: 0.1,
      max_completion_tokens: 320,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: GPT_SYSTEM },
        { role: "user", content: userMsg },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseGptJson(raw);
    if (!parsed) {
      return {
        allowed: false,
        slackAlert: true,
        slackSummaryJa: "GPT判定の解析に失敗",
        source: "gpt",
        toneFlag: "ok",
        toneReason: "",
      };
    }
    // 掲載は可でも、トーンが "ok" 以外なら運営に通知する。
    const slackAlert = parsed.slack_alert || parsed.tone !== "ok";
    return {
      allowed: parsed.allowed,
      slackAlert,
      slackSummaryJa: parsed.summary_ja || "（要約なし）",
      source: "gpt",
      toneFlag: parsed.tone,
      toneReason: parsed.tone_reason,
    };
  } catch (e) {
    console.error("[community-moderation] GPT policy check", e);
    return {
      allowed: false,
      slackAlert: false,
      slackSummaryJa: "GPTエラー",
      source: "error",
      toneFlag: "ok",
      toneReason: "",
    };
  }
}

/**
 * Moderation API で明らかな違反を先に落とし（コスト・レイテンシ削減）、
 * 通過時のみ GPT で教育コミュニティ文脈の補助判定を行う。
 */
export async function moderateCommunityText(
  openai: OpenAI,
  text: string,
  kind: CommunityModerationKind
): Promise<CommunityModerationOutcome> {
  const trimmed = text.trim().slice(0, 12000);
  if (!trimmed) {
    return {
      allowed: false,
      slackAlert: false,
      slackSummaryJa: "空の内容",
      source: "error",
      toneFlag: "ok",
      toneReason: "",
    };
  }

  try {
    let mod: Awaited<ReturnType<OpenAI["moderations"]["create"]>>;
    try {
      mod = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: trimmed,
      });
    } catch {
      mod = await openai.moderations.create({ input: trimmed });
    }
    const result = mod.results[0];
    if (result?.flagged) {
      return {
        allowed: false,
        slackAlert: true,
        slackSummaryJa: `OpenAI Moderation（${topScoringCategory(result.category_scores)}）`,
        source: "moderation",
        toneFlag: "ok",
        toneReason: "",
      };
    }
  } catch (e) {
    console.error("[community-moderation] moderations.create", e);
    return {
      allowed: false,
      slackAlert: false,
      slackSummaryJa: "Moderation API エラー",
      source: "error",
      toneFlag: "ok",
      toneReason: "",
    };
  }

  const gpt = await runGptPolicyCheck(openai, trimmed, kind);
  return {
    allowed: gpt.allowed,
    slackAlert: gpt.slackAlert,
    slackSummaryJa: gpt.slackSummaryJa,
    source: gpt.source,
    toneFlag: gpt.toneFlag,
    toneReason: gpt.toneReason,
  };
}
