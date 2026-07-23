import { prisma } from "@/lib/prisma";

export type AiMode = "navigator" | "debate" | "discussion";

export const DEFAULT_AI_CHAT_PROMPTS: Record<AiMode, string> = {
  navigator: `あなたは教育ICT・EdTechに詳しいAIアシスタントです。このサイト（エデュマッチ）は教育サービス・教材のマッチングプラットフォームです。

## 回答の仕方
- **ユーザーの質問に自然に答える**：まず質問の内容そのものに答える
- **公的文書参照（RAG）の抜粋が含まれる場合**、「〈文書名〉によれば」を文中に含める
- **サイト内の関連サービス・記事**は回答に自然に織り交ぜる
- **冗長にしない**：原則3〜6文、長くても箇条書き3点まで
- **会話感を重視**：必要なら最後に1つだけ確認質問を返す
- Markdown形式で読みやすく。日本語で丁寧に。`,
  debate: `あなたは「エデュマッチ」のAIディベートパートナーです。

## 絶対ルール
- ユーザーが示す立場・意見に対して **必ず正反対の立場** をとる（例外なし）
- 回答冒頭で「私は〇〇に反対（賛成）の立場をとります」と宣言する
- 感情論は使わず、**データ・事例・論理**で反論する

## 分量ルール
- 1ターンあたり3〜5文。長くなる場合は箇条書き最大3点。
- 最後に必ず1つだけ問い返しをつける。

Markdown形式。日本語で。`,
  discussion: `あなたは「エデュマッチ」のAIディスカッションパートナーです。

## スタンス
- まずユーザーの意見・感情を **共感・肯定** してから話を進める
- **問いかけ**を通じて一緒に考える姿勢を保つ
- 多様な視点を提示して思考を広げる

## 分量ルール
- 1ターンあたり3〜5文。
- 共感→視点提示→問い返しの3ステップで完結させる。
- 最後は**必ず問いかけ**で終わる。

Markdown形式。日本語で。`,
};

const AI_PROMPT_KEYS: Record<AiMode, string> = {
  navigator: "navigator",
  debate: "debate",
  discussion: "discussion",
};

export function isAiMode(value: string): value is AiMode {
  return value in AI_PROMPT_KEYS;
}

export async function getAiChatPrompts(): Promise<Record<AiMode, string>> {
  const rows = await prisma.systemPromptOverride.findMany({
    where: { mode: { in: Object.values(AI_PROMPT_KEYS) } },
    select: { mode: true, content: true },
  });
  const byMode = new Map(rows.map((r) => [r.mode, r.content]));

  return {
    navigator: byMode.get("navigator") || DEFAULT_AI_CHAT_PROMPTS.navigator,
    debate: byMode.get("debate") || DEFAULT_AI_CHAT_PROMPTS.debate,
    discussion: byMode.get("discussion") || DEFAULT_AI_CHAT_PROMPTS.discussion,
  };
}

export async function saveAiChatPrompt(mode: AiMode, prompt: string, updatedBy?: string): Promise<void> {
  await prisma.systemPromptOverride.upsert({
    where: { mode: AI_PROMPT_KEYS[mode] },
    update: { content: prompt, ...(updatedBy ? { updated_by: updatedBy } : {}) },
    create: { mode: AI_PROMPT_KEYS[mode], content: prompt, ...(updatedBy ? { updated_by: updatedBy } : {}) },
  });
}

export async function resetAiChatPrompt(mode: AiMode): Promise<void> {
  await prisma.systemPromptOverride.deleteMany({ where: { mode: AI_PROMPT_KEYS[mode] } });
}
