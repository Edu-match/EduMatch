import OpenAI from "openai";
import { parseLooseJson } from "@/lib/persona-ai";

/**
 * 歴史上の人物などの「特別ペルソナ」を、ネット検索で調べて作るためのサーバー専用ヘルパー。
 * 生成前にAIによる法的チェック（著作権・肖像権・パブリシティ権・名誉等）を行う。
 * ※AIの判定は参考情報であり、法的助言ではない。
 */

export const HISTORICAL_TEXT_MODEL = process.env.HISTORICAL_PERSONA_MODEL?.trim() || "gpt-5.4";
export const HISTORICAL_SEARCH_MODEL = process.env.HISTORICAL_SEARCH_MODEL?.trim() || "gpt-5.4";

export type LegalVerdict = {
  /** ok=問題が少ない / caution=要注意（運用配慮の上で可） / blocked=作成を避けるべき */
  status: "ok" | "caution" | "blocked";
  /** 存命（生存中）の人物と判断される場合 true。原則ブロック対象。 */
  living: boolean;
  note: string;
};

/** 指定人物のAIペルソナ＋オリジナルイラストを作る際の法的リスクをAIが点検する。 */
export async function checkHistoricalPersonaLegal(name: string): Promise<LegalVerdict | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const openai = new OpenAI({ apiKey });

  const system = `あなたは日本法に詳しい教育サービスの法務アシスタントです。次の人物について、教育コミュニティ向けに「AIペルソナ（本人を模した発言AI）」と「オリジナルのイラスト風アバター（実在の写真・肖像画を複製しない）」を作成・公開する場合の法的リスクを点検します。
観点: ①著作権（本人の著作物の利用有無／引用の範囲）②肖像権・パブリシティ権（故人か存命か、没後経過、写真の複製有無）③名誉毀損・故人の名誉や遺族感情 ④なりすまし・誤情報の懸念。
最重要: まず人物が「存命（生存中）」か「故人」かを判断する。存命と判断される、または存命かどうか不明な実在個人は living=true とし、原則 status="blocked"（本人・権利者の許可が前提）とする。
判定基準の目安:
- 没後長期（おおむね歴史上の人物・パブリックドメイン）で、オリジナルイラスト＆史実ベースなら living=false, status="ok"。
- 近年の故人・著名な実在人物で権利が残りうる、または誤情報・名誉の懸念があるなら living=false, status="caution"。
- 存命の実在個人（または生死不明の実在個人）、著作権で保護されたフィクションのキャラクター、明らかに権利侵害・なりすましになる場合は status="blocked"。存命の場合は必ず living=true。
出力は次のJSONのみ（前置きなし）:
{ "status": "ok" | "caution" | "blocked", "living": true | false, "note": "理由と運用上の注意を日本語で120〜200字。存命の場合はその旨と『本人・権利者の許可が必要』を明記。最後に『※AIによる参考判定であり法的助言ではありません』を付す" }`;

  try {
    const res = await openai.responses.create({
      model: HISTORICAL_TEXT_MODEL,
      instructions: system,
      input: `人物名: ${name}`,
      temperature: 0.2,
      max_output_tokens: 1200,
    });
    const j = parseLooseJson(res.output_text) as { status?: string; living?: boolean; note?: string } | null;
    if (!j) return null;
    const living = j.living === true;
    // 存命なら安全側に倒し、必ず blocked にする。
    const status = living ? "blocked" : j.status === "blocked" ? "blocked" : j.status === "caution" ? "caution" : "ok";
    return { status, living, note: (j.note ?? "").slice(0, 400) };
  } catch (e) {
    console.error("[historical-persona] legal", e);
    return null;
  }
}

/** ネット検索で人物像（時代・立場・思想・口調・代表的な見解）を調べ、日本語要約を返す。 */
export async function researchHistoricalFigure(name: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return "";
  const openai = new OpenAI({ apiKey });

  const prompt = `「${name}」について、教育コミュニティで本人らしく発言するAIペルソナを作るための要点を、ネット検索で確認しながら日本語でまとめてください。
含める項目: 生没年・時代背景／立場・役割／大切にした思想・価値観／よく語った主張やエピソード／口調や一人称の特徴（史料から推測される範囲で）／教育や学びに関連する考え。
史実に基づき、不確かな点は「諸説あり」と明記。500〜800字程度。`;

  try {
    const res = await openai.responses.create({
      model: HISTORICAL_SEARCH_MODEL,
      tools: [{ type: "web_search" as const }],
      input: prompt,
    });
    return (res.output_text ?? "").slice(0, 4000);
  } catch (e) {
    console.error("[historical-persona] research", e);
    return "";
  }
}
