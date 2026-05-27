/**
 * YouTube 動画の字幕（トランスクリプト）を取得する。
 * 公式 API キー不要。watch ページから captionTracks を解析する。
 */

type CaptionTrack = {
  baseUrl: string;
  languageCode: string;
  kind?: string;
  name?: { simpleText?: string };
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parseTranscriptXml(xml: string): string {
  const segments: string[] = [];
  const re = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const raw = m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\n/g, " ")
      .trim();
    if (raw) segments.push(decodeHtmlEntities(raw));
  }
  return segments.join(" ").replace(/\s+/g, " ").trim();
}

function pickCaptionTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  if (tracks.length === 0) return null;
  const score = (t: CaptionTrack): number => {
    const lang = t.languageCode.toLowerCase();
    const isAsr = t.kind === "asr" ? 0 : 10;
    if (lang === "ja" || lang.startsWith("ja-")) return 100 + isAsr;
    if (lang === "en" || lang.startsWith("en-")) return 50 + isAsr;
    return 10 + isAsr;
  };
  return [...tracks].sort((a, b) => score(b) - score(a))[0] ?? null;
}

function extractCaptionTracks(html: string): CaptionTrack[] {
  const marker = '"captionTracks":';
  const idx = html.indexOf(marker);
  if (idx < 0) return [];
  const start = html.indexOf("[", idx);
  if (start < 0) return [];
  let depth = 0;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1)) as CaptionTrack[];
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

export type YoutubeTranscriptResult = {
  text: string;
  languageCode: string;
  source: "captions" | "description";
};

/** YouTube 動画ページの説明文（meta / shortDescription）を取得 */
export async function fetchYoutubeDescription(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ja,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const shortDesc = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
    if (shortDesc?.[1]) {
      try {
        return JSON.parse(`"${shortDesc[1]}"`).trim() || null;
      } catch {
        return shortDesc[1].replace(/\\n/g, "\n").trim() || null;
      }
    }

    const ogDesc = html.match(/<meta name="description" content="([^"]*)"/);
    return ogDesc?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

/** 字幕トラックを優先し、なければ YouTube 上の説明文を返す */
export async function fetchYoutubeTranscript(
  videoId: string
): Promise<YoutubeTranscriptResult | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ja,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const tracks = extractCaptionTracks(html);
    const track = pickCaptionTrack(tracks);
    if (track?.baseUrl) {
      const captionUrl = track.baseUrl.includes("&fmt=")
        ? track.baseUrl
        : `${track.baseUrl}&fmt=srv3`;
      const capRes = await fetch(captionUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(12000),
      });
      if (capRes.ok) {
        const xml = await capRes.text();
        const text = parseTranscriptXml(xml);
        if (text.length >= 80) {
          return {
            text: text.slice(0, 50000),
            languageCode: track.languageCode,
            source: "captions",
          };
        }
      }
    }

    const shortDesc = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
    let description: string | null = null;
    if (shortDesc?.[1]) {
      try {
        description = JSON.parse(`"${shortDesc[1]}"`).trim();
      } catch {
        description = shortDesc[1].replace(/\\n/g, "\n").trim();
      }
    }
    if (description && description.length >= 40) {
      return {
        text: description.slice(0, 8000),
        languageCode: "description",
        source: "description",
      };
    }

    return null;
  } catch (e) {
    console.error("[youtube-transcript]", e);
    return null;
  }
}
