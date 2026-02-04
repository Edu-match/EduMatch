"use client";

import Image from "next/image";
import { useMemo } from "react";

type ContentBlock = {
  type: "text" | "image";
  content: string;
  alt?: string;
};

/**
 * 本文コンテンツをパースして、画像URLとMarkdown画像を検出
 */
function parseContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  
  // Markdown画像記法: ![alt](url)
  const markdownImagePattern = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s)]*)?)\)/gi;
  
  // 通常の画像URL（http/httpsで始まり、画像拡張子で終わる）
  const plainImageUrlPattern = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s]*)?)/gi;
  
  // まずMarkdown記法の画像を処理
  let processedContent = content;
  const markdownMatches: Array<{ index: number; length: number; url: string; alt: string }> = [];
  
  let markdownMatch;
  const markdownRegex = new RegExp(markdownImagePattern);
  while ((markdownMatch = markdownRegex.exec(content)) !== null) {
    markdownMatches.push({
      index: markdownMatch.index,
      length: markdownMatch[0].length,
      url: markdownMatch[2],
      alt: markdownMatch[1] || "画像",
    });
  }
  
  // マッチを逆順で処理（インデックスがずれないように）
  markdownMatches.reverse();
  for (const match of markdownMatches) {
    processedContent =
      processedContent.substring(0, match.index) +
      `__IMAGE__${match.url}__ALT__${match.alt}__` +
      processedContent.substring(match.index + match.length);
  }
  
  // 次に通常の画像URLを処理
  const plainMatches: Array<{ index: number; length: number; url: string }> = [];
  let plainMatch;
  const plainRegex = new RegExp(plainImageUrlPattern);
  while ((plainMatch = plainRegex.exec(processedContent)) !== null) {
    // __IMAGE__タグの中にある場合はスキップ
    if (!processedContent.substring(Math.max(0, plainMatch.index - 10), plainMatch.index).includes("__IMAGE__")) {
      plainMatches.push({
        index: plainMatch.index,
        length: plainMatch[0].length,
        url: plainMatch[0],
      });
    }
  }
  
  // マッチを逆順で処理
  plainMatches.reverse();
  for (const match of plainMatches) {
    processedContent =
      processedContent.substring(0, match.index) +
      `__IMAGE__${match.url}__ALT__画像__` +
      processedContent.substring(match.index + match.length);
  }
  
  // 最終的にブロックに分割
  const parts = processedContent.split(/(__IMAGE__[^_]+__ALT__[^_]+__)/);
  
  for (const part of parts) {
    if (part.startsWith("__IMAGE__")) {
      const [, url, alt] = part.match(/__IMAGE__([^_]+)__ALT__([^_]+)__/) || [];
      if (url) {
        blocks.push({ type: "image", content: url, alt: alt || "画像" });
      }
    } else if (part.trim()) {
      blocks.push({ type: "text", content: part });
    }
  }
  
  // 画像が見つからなかった場合は、全体をテキストとして扱う
  if (blocks.length === 0) {
    blocks.push({ type: "text", content });
  }
  
  return blocks;
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
          <div
            key={index}
            className="whitespace-pre-wrap text-foreground leading-relaxed"
          >
            {block.content}
          </div>
        );
      })}
    </div>
  );
}
