/**
 * YouTube 動画のメタデータ（タイトル・概要欄・チャンネル名）を取得する。
 * 公式 API キー不要。
 * - タイトルは oEmbed エンドポイントから（軽量・安定）
 * - 概要欄は watch ページの shortDescription から
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type YoutubeMetadata = {
  youtubeId: string;
  title: string;
  description: string;
  channelTitle: string | null;
};

type OEmbedResponse = {
  title?: string;
  author_name?: string;
};

async function fetchOEmbed(videoId: string): Promise<OEmbedResponse | null> {
  try {
    const target = `https://www.youtube.com/watch?v=${videoId}`;
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "ja,en;q=0.9" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as OEmbedResponse;
  } catch {
    return null;
  }
}

function extractDescriptionFromHtml(html: string): string {
  const shortDesc = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
  if (shortDesc?.[1]) {
    try {
      return JSON.parse(`"${shortDesc[1]}"`).trim();
    } catch {
      return shortDesc[1].replace(/\\n/g, "\n").trim();
    }
  }
  const ogDesc = html.match(/<meta name="description" content="([^"]*)"/);
  return ogDesc?.[1]?.trim() ?? "";
}

function extractChannelTitleFromHtml(html: string): string | null {
  const author = html.match(/"author":"((?:\\.|[^"\\])*)"/);
  if (author?.[1]) {
    try {
      return JSON.parse(`"${author[1]}"`);
    } catch {
      return author[1];
    }
  }
  return null;
}

function extractTitleFromHtml(html: string): string | null {
  const titleMatch = html.match(/"title":"((?:\\.|[^"\\])*)"/);
  if (titleMatch?.[1]) {
    try {
      return JSON.parse(`"${titleMatch[1]}"`);
    } catch {
      return titleMatch[1];
    }
  }
  const ogTitle = html.match(/<meta property="og:title" content="([^"]*)"/);
  return ogTitle?.[1] ?? null;
}

/** タイトル・概要欄・チャンネル名を取得 */
export async function fetchYoutubeMetadata(videoId: string): Promise<YoutubeMetadata | null> {
  let html = "";
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "ja,en;q=0.9" },
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) html = await res.text();
  } catch {
    // フォールバックで oEmbed のみ使う
  }

  const oembed = await fetchOEmbed(videoId);

  const title = oembed?.title?.trim() || (html ? extractTitleFromHtml(html)?.trim() : null);
  if (!title) return null;

  const description = html ? extractDescriptionFromHtml(html) : "";
  const channelTitle =
    oembed?.author_name?.trim() ||
    (html ? extractChannelTitleFromHtml(html)?.trim() ?? null : null);

  return {
    youtubeId: videoId,
    title,
    description,
    channelTitle,
  };
}
