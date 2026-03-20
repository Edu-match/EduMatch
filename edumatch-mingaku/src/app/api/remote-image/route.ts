import { NextResponse } from "next/server";

const FILE_ID_RE = /^[a-zA-Z0-9_-]+$/;

/**
 * Google Drive の画像をサーバー側で取得して配信（ブラウザ直リンクの 403 回避）
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("gd");
  if (!id || !FILE_ID_RE.test(id)) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  const candidates = [
    `https://drive.google.com/thumbnail?id=${id}&sz=w2000`,
    `https://drive.google.com/uc?export=download&id=${id}`,
  ];

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  };

  for (const src of candidates) {
    try {
      const upstream = await fetch(src, {
        headers,
        redirect: "follow",
        cache: "force-cache",
        next: { revalidate: 3600 },
      });

      if (!upstream.ok) continue;

      const contentType = upstream.headers.get("content-type") || "";

      if (contentType.startsWith("image/")) {
        const body = upstream.body;
        if (!body) continue;
        return new NextResponse(body, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      }

      // HTML のウイルススキャン画面などを除外してバイナリ推定
      if (
        contentType.includes("octet-stream") ||
        contentType.includes("application/binary")
      ) {
        const buf = await upstream.arrayBuffer();
        if (buf.byteLength < 4) continue;
        const head = new Uint8Array(buf.slice(0, 4));
        const jpeg = head[0] === 0xff && head[1] === 0xd8;
        const png = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
        const gif = head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46;
        const webp =
          buf.byteLength >= 12 &&
          head[0] === 0x52 &&
          head[1] === 0x49 &&
          head[2] === 0x46 &&
          head[3] === 0x46;
        if (jpeg || png || gif || webp) {
          const outType = jpeg ? "image/jpeg" : png ? "image/png" : gif ? "image/gif" : "image/webp";
          return new NextResponse(buf, {
            status: 200,
            headers: {
              "Content-Type": outType,
              "Cache-Control": "public, max-age=3600, s-maxage=3600",
            },
          });
        }
      }
    } catch {
      continue;
    }
  }

  return new NextResponse("Image unavailable", { status: 502 });
}
