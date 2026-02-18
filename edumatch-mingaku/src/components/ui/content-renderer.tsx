"use client";

import Image from "next/image";
import { useMemo } from "react";
import { YouTubeEmbed } from "./youtube-embed";

type ContentBlock = {
  type: "text" | "image" | "youtube";
  content: string;
  alt?: string;
};

/**
 * 本文コンテンツをパースして、画像URL、YouTube URL、Markdown画像を検出
 */
function parseContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  
  // YouTube URL パターン
  const youtubePattern = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:[^\s]*))/gi;
  
  // Markdown画像記法: ![alt](url)
  const markdownImagePattern = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s)]*)?)\)/gi;
  
  // 通常の画像URL（http/httpsで始まり、画像拡張子で終わる）
  const plainImageUrlPattern = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s]*)?)/gi;
  
  let processedContent = content;
  
  // まずYouTube URLを処理（最優先）
  const youtubeMatches: Array<{ index: number; length: number; url: string }> = [];
  let youtubeMatch;
  const youtubeRegex = new RegExp(youtubePattern);
  while ((youtubeMatch = youtubeRegex.exec(content)) !== null) {
    youtubeMatches.push({
      index: youtubeMatch.index,
      length: youtubeMatch[0].length,
      url: youtubeMatch[0],
    });
  }
  
  // マッチを逆順で処理（インデックスがずれないように）
  youtubeMatches.reverse();
  for (const match of youtubeMatches) {
    processedContent =
      processedContent.substring(0, match.index) +
      `__YOUTUBE__${match.url}__` +
      processedContent.substring(match.index + match.length);
  }
  
  // 次にMarkdown記法の画像を処理
  const markdownMatches: Array<{ index: number; length: number; url: string; alt: string }> = [];
  let markdownMatch;
  const markdownRegex = new RegExp(markdownImagePattern);
  while ((markdownMatch = markdownRegex.exec(processedContent)) !== null) {
    markdownMatches.push({
      index: markdownMatch.index,
      length: markdownMatch[0].length,
      url: markdownMatch[2],
      alt: markdownMatch[1] || "画像",
    });
  }
  
  markdownMatches.reverse();
  for (const match of markdownMatches) {
    processedContent =
      processedContent.substring(0, match.index) +
      `__IMAGE__${match.url}__ALT__${match.alt}__` +
      processedContent.substring(match.index + match.length);
  }
  
  // 最後に通常の画像URLを処理
  const plainMatches: Array<{ index: number; length: number; url: string }> = [];
  let plainMatch;
  const plainRegex = new RegExp(plainImageUrlPattern);
  while ((plainMatch = plainRegex.exec(processedContent)) !== null) {
    // __IMAGE__や__YOUTUBE__タグの中にある場合はスキップ
    const beforeText = processedContent.substring(Math.max(0, plainMatch.index - 15), plainMatch.index);
    if (!beforeText.includes("__IMAGE__") && !beforeText.includes("__YOUTUBE__")) {
      plainMatches.push({
        index: plainMatch.index,
        length: plainMatch[0].length,
        url: plainMatch[0],
      });
    }
  }
  
  plainMatches.reverse();
  for (const match of plainMatches) {
    processedContent =
      processedContent.substring(0, match.index) +
      `__IMAGE__${match.url}__ALT__画像__` +
      processedContent.substring(match.index + match.length);
  }
  
  // 最終的にブロックに分割
  const parts = processedContent.split(/(__YOUTUBE__[^_]+__|__IMAGE__[^_]+__ALT__[^_]+__)/);
  
  for (const part of parts) {
    if (part.startsWith("__YOUTUBE__")) {
      const url = part.match(/__YOUTUBE__([^_]+)__/)?.[1];
      if (url) {
        blocks.push({ type: "youtube", content: url });
      }
    } else if (part.startsWith("__IMAGE__")) {
      const [, url, alt] = part.match(/__IMAGE__([^_]+)__ALT__([^_]+)__/) || [];
      if (url) {
        blocks.push({ type: "image", content: url, alt: alt || "画像" });
      }
    } else if (part.trim()) {
      blocks.push({ type: "text", content: part });
    }
  }
  
  // ブロックが見つからなかった場合は、全体をテキストとして扱う
  if (blocks.length === 0) {
    blocks.push({ type: "text", content });
  }
  
  return blocks;
}

/**
 * 簡易マークダウン風（# ## ###）のテキストを見出し・段落で表示
 */
function MarkdownLikeContent({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let keyIndex = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h3
          key={`md-${keyIndex++}`}
          className="mt-6 mb-2 text-lg font-semibold text-foreground scroll-mt-20"
        >
          {trimmed.slice(4)}
        </h3>
      );
      i += 1;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h2
          key={`md-${keyIndex++}`}
          className="mt-8 mb-3 text-xl font-semibold text-foreground scroll-mt-20 border-b border-border/60 pb-1"
        >
          {trimmed.slice(3)}
        </h2>
      );
      i += 1;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      nodes.push(
        <h1
          key={`md-${keyIndex++}`}
          className="mt-8 mb-3 text-2xl font-bold text-foreground scroll-mt-20"
        >
          {trimmed.slice(2)}
        </h1>
      );
      i += 1;
      continue;
    }

    // 空行はスキップ
    if (trimmed === "") {
      i += 1;
      continue;
    }

    // 連続する通常行を1つの段落に（# / ## / ### で始まる行は見出しなので区切る）
    const isHeadingLine = (s: string) =>
      s.startsWith("# ") || s.startsWith("## ") || s.startsWith("### ");
    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const ln = lines[i];
      const t = ln.trimEnd();
      if (t === "" || isHeadingLine(t)) break;
      paragraphLines.push(ln);
      i += 1;
    }
    if (paragraphLines.length > 0) {
      const singleLine = paragraphLines.length === 1 ? paragraphLines[0].trim() : "";
      // # を使っていない本文向け：短い単独行（目安 45 文字以下）を見出し風に表示
      const looksLikeHeading =
        singleLine &&
        singleLine.length <= 45 &&
        !singleLine.endsWith("。") &&
        !singleLine.endsWith("、");
      if (looksLikeHeading) {
        nodes.push(
          <h3
            key={`md-${keyIndex++}`}
            className="mt-6 mb-2 text-lg font-semibold text-foreground scroll-mt-20"
          >
            {singleLine}
          </h3>
        );
      } else {
        nodes.push(
          <p
            key={`md-${keyIndex++}`}
            className="text-base text-foreground leading-relaxed mb-4 last:mb-0"
          >
            {paragraphLines.join("\n")}
          </p>
        );
      }
    }
  }

  return <>{nodes}</>;
}

type ContentRendererProps = {
  content: string;
  className?: string;
};

/**
 * コンテンツをレンダリングするコンポーネント
 * テキストと画像URLを自動的に判別して表示
 */
export function ContentRenderer({ content, className }: ContentRendererProps) {
  const blocks = useMemo(() => parseContent(content), [content]);
  
  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === "youtube") {
          return (
            <div key={index} className="my-6">
              <YouTubeEmbed url={block.content} title={`YouTube動画 ${index + 1}`} />
            </div>
          );
        }
        
        if (block.type === "image") {
          return (
            <div
              key={index}
              className="my-6 relative w-full rounded-lg overflow-hidden bg-muted"
            >
              <div className="relative aspect-video w-full">
                <Image
                  src={block.content}
                  alt={block.alt || `コンテンツ画像 ${index + 1}`}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          );
        }
        
        return (
          <div key={index} className="content-body">
            <MarkdownLikeContent text={block.content} />
          </div>
        );
      })}
    </div>
  );
}
