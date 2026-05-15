/**
 * テキストをチャンク化するユーティリティ関数
 */

export interface Chunk {
  content: string;
  startIndex: number;
  endIndex: number;
}

const MAX_CHUNK_CHARS = 2000;
const MIN_CHUNK_CHARS = 30;
const OVERLAP_CHARS = 200;

/**
 * HTML タグと特殊文字を削除
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * テキストを段落ベースのチャンクに分割
 * @param text クリーンなテキスト
 * @param maxChars チャンク最大文字数
 * @param overlapChars オーバーラップ文字数
 * @returns チャンク配列
 */
export function chunkifyText(
  text: string,
  maxChars = MAX_CHUNK_CHARS,
  overlapChars = OVERLAP_CHARS
): string[] {
  const cleaned = text.trim();
  if (cleaned.length === 0) return [];

  // 2行以上の空行で段落分割
  const paragraphs = cleaned.split(/\n\n+/);

  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (trimmedPara.length === 0) continue;

    // 段落を連結
    const candidate = currentChunk
      ? currentChunk + "\n\n" + trimmedPara
      : trimmedPara;

    if (candidate.length <= maxChars) {
      currentChunk = candidate;
    } else {
      // 現在のチャンクを確定
      if (currentChunk.length >= MIN_CHUNK_CHARS) {
        chunks.push(currentChunk);
      }

      // 新しいチャンクを開始（オーバーラップ付き）
      if (chunks.length > 0 && overlapChars > 0) {
        const lastChunk = chunks[chunks.length - 1];
        const overlapText = lastChunk.slice(-overlapChars);
        currentChunk = overlapText + "\n\n" + trimmedPara;
      } else {
        currentChunk = trimmedPara;
      }

      // 1つの段落がchunkサイズを超える場合は文単位で分割
      if (currentChunk.length > maxChars) {
        const sentences = currentChunk.split(/(?<=[。！？])\s+/);
        let sentenceChunk = "";
        for (const sentence of sentences) {
          if ((sentenceChunk + sentence).length <= maxChars) {
            sentenceChunk += sentence + " ";
          } else {
            if (sentenceChunk.length >= MIN_CHUNK_CHARS) {
              chunks.push(sentenceChunk.trim());
            }
            sentenceChunk = sentence + " ";
          }
        }
        currentChunk = sentenceChunk.trim();
      }
    }
  }

  // 最後のチャンクを追加
  if (currentChunk.length >= MIN_CHUNK_CHARS) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * テキストをクリーン化してチャンク化する統合関数
 */
export function cleanAndChunk(text: string): string[] {
  const cleaned = stripHtml(text);
  return chunkifyText(cleaned);
}

/**
 * 複数フィールドを連結してチャンク化
 */
export function chunksFromMultipleFields(fields: (string | null | undefined)[]): string[] {
  const combined = fields
    .filter((f) => f && typeof f === "string" && f.trim().length > 0)
    .join("\n\n");

  return cleanAndChunk(combined);
}

/**
 * テキストを指定文字数で切り詰める
 */
export function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "…";
}
