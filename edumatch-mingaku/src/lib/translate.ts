import OpenAI from "openai";
import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";

/**
 * DB 由来の動的テキスト（サービス名・記事本文・フォーラム投稿など、メッセージ辞書に
 * 載せられないユーザー生成コンテンツ）を、表示言語に合わせて機械翻訳するヘルパー。
 *
 * - ソース言語は日本語（defaultLocale）想定。表示言語が ja のときは翻訳せずそのまま返す。
 * - 翻訳結果は Next.js のデータキャッシュ（unstable_cache）+ プロセス内メモリにキャッシュし、
 *   同じ文字列の再翻訳・APIコストを抑える。DB スキーマ変更（マイグレーション）は不要。
 */

const TRANSLATE_MODEL = process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-5.4";
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30日

const localeNames: Record<Locale, string> = {
  ja: "Japanese",
  en: "English",
};

/** プロセス内メモリキャッシュ（同一リクエスト/インスタンス内の重複翻訳を即時に解決） */
const memoryCache = new Map<string, string>();

function cacheKey(text: string, target: Locale): string {
  return `${TRANSLATE_MODEL}:${target}:${text}`;
}

async function callOpenAiTranslate(text: string, target: Locale): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return text; // 鍵が無い環境では原文をそのまま返す（フェイルセーフ）

  const openai = new OpenAI({ apiKey });
  const targetName = localeNames[target];

  try {
    const completion = await openai.chat.completions.create({
      model: TRANSLATE_MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            `You are a professional translator for an education-technology platform. ` +
            `Translate the user's text into ${targetName}. ` +
            `Preserve meaning, tone, line breaks, Markdown/HTML structure, URLs, and placeholders such as {name} or %s exactly. ` +
            `Do not add explanations or quotation marks. Output only the translated text. ` +
            `Keep proper nouns, product names, and brand names untranslated when appropriate.`,
        },
        { role: "user", content: text },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || text;
  } catch {
    // 翻訳失敗時は原文を返す（UI を壊さない）
    return text;
  }
}

/** unstable_cache でラップした永続キャッシュ付き翻訳 */
const cachedTranslate = unstable_cache(
  async (text: string, target: Locale): Promise<string> => {
    return callOpenAiTranslate(text, target);
  },
  ["content-translation"],
  { revalidate: CACHE_TTL_SECONDS, tags: ["content-translation"] }
);

/**
 * 単一テキストを表示言語へ翻訳する。
 * @param text   原文（日本語想定）
 * @param target 表示言語。省略時は現在のリクエストのロケールを使用。
 */
export async function translateText(
  text: string | null | undefined,
  target?: Locale
): Promise<string> {
  if (!text || !text.trim()) return text ?? "";

  const locale = target ?? (await resolveLocale());
  if (locale === defaultLocale) return text;

  const key = cacheKey(text, locale);
  const cached = memoryCache.get(key);
  if (cached !== undefined) return cached;

  const result = await cachedTranslate(text, locale);
  memoryCache.set(key, result);
  return result;
}

/** 複数テキストをまとめて翻訳（並列実行） */
export async function translateMany(
  texts: (string | null | undefined)[],
  target?: Locale
): Promise<string[]> {
  const locale = target ?? (await resolveLocale());
  return Promise.all(texts.map((t) => translateText(t, locale)));
}

/**
 * オブジェクトの指定フィールドだけを翻訳して新しいオブジェクトを返す。
 * @example const localized = await translateFields(service, ["title", "description"]);
 */
export async function translateFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  target?: Locale
): Promise<T> {
  const locale = target ?? (await resolveLocale());
  if (locale === defaultLocale) return obj;

  const translatedValues = await Promise.all(
    fields.map((f) => {
      const value = obj[f];
      return typeof value === "string" ? translateText(value, locale) : Promise.resolve(value);
    })
  );

  const next = { ...obj };
  fields.forEach((f, i) => {
    (next as Record<keyof T, unknown>)[f] = translatedValues[i];
  });
  return next;
}

/**
 * 配列をまとめて翻訳する（一覧ページ向け）。
 * 1リクエストにつき複数テキストを JSON でまとめて送り、API 呼び出し回数を大幅に削減する。
 * 失敗時・鍵未設定時は原文を返す。
 */
const BATCH_SIZE = 40;

export async function translateBatch(
  texts: (string | null | undefined)[],
  target?: Locale
): Promise<string[]> {
  const locale = target ?? (await resolveLocale());
  const inputs = texts.map((t) => t ?? "");
  if (locale === defaultLocale) return inputs;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return inputs;

  const result = [...inputs];
  const openai = new OpenAI({ apiKey });
  const targetName = localeNames[locale];

  // メモリ未キャッシュの index だけ集める
  const pending: { index: number; text: string }[] = [];
  inputs.forEach((text, index) => {
    if (!text.trim()) return;
    const cached = memoryCache.get(cacheKey(text, locale));
    if (cached !== undefined) {
      result[index] = cached;
    } else {
      pending.push({ index, text });
    }
  });

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);
    try {
      const completion = await openai.chat.completions.create({
        model: TRANSLATE_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `You are a professional translator for an education-technology platform. ` +
              `Translate each string in the input JSON array "items" into ${targetName}. ` +
              `Preserve meaning, proper nouns, URLs, and placeholders. ` +
              `Respond with a JSON object {"items": [...]} containing the translations in the same order and length. Output only translated strings.`,
          },
          { role: "user", content: JSON.stringify({ items: chunk.map((c) => c.text) }) },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      const parsed = JSON.parse(raw) as { items?: unknown };
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      chunk.forEach((c, j) => {
        const translated = typeof items[j] === "string" && items[j] ? (items[j] as string) : c.text;
        result[c.index] = translated;
        memoryCache.set(cacheKey(c.text, locale), translated);
      });
    } catch {
      // 失敗チャンクは原文のまま
    }
  }

  return result;
}

async function resolveLocale(): Promise<Locale> {
  try {
    const locale = await getLocale();
    return isLocale(locale) ? locale : defaultLocale;
  } catch {
    return defaultLocale;
  }
}
