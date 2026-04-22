"use client";

import React from "react";
import { useMemo } from "react";
import { sanitizeHtml, looksLikeHtml } from "@/lib/sanitize-html";
import { renderInlineMarkdown } from "@/lib/inline-markdown";
import { YouTubeEmbed } from "./youtube-embed";
import { RAW_MARKDOWN_PREFIX } from "@/lib/markdown-to-blocks";
import { ImageWithUrlError } from "@/components/ui/image-with-url-error";
import { repairLeakedYoutubePlaceholdersInMarkdown } from "@/lib/youtube-content-placeholder";
import { matchVideoEmbedMarkdownLine } from "@/lib/video-embed-markdown";

function stripRawMarkdownPrefix(content: string): string {
  const trimmed = content.trimStart();
  return trimmed.startsWith(RAW_MARKDOWN_PREFIX)
    ? trimmed.slice(RAW_MARKDOWN_PREFIX.length)
    : content;
}

type ContentBlock = {
  type: "text" | "image";
  content: string;
  alt?: string;
};

/** HTML 本文は YouTube を自動検出しない */
function extractYoutubeOnly(content: string): ContentBlock[] {
  return [{ type: "text", content: content || "" }];
}

/**
 * 本文コンテンツをパースして、画像URL、YouTube URL、Markdown画像を検出
 * HTML本文の場合は画像置換を行わず、YouTubeのみ抽出する
 */
function parseContent(content: string): ContentBlock[] {
  const text = repairLeakedYoutubePlaceholdersInMarkdown(content);
  if (looksLikeHtml(text)) {
    return extractYoutubeOnly(text);
  }

  const blocks: ContentBlock[] = [];
  // ![alt](url) 形式：拡張子付きURL に加え、Google Drive / GitHub も画像として認識
  const markdownImagePattern =
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+(?:\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s)]*)?)?)\)/gi;
  const plainImageUrlPattern = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s]*)?)/gi;

  let processedContent = text;

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

  const plainMatches: Array<{ index: number; length: number; url: string }> = [];
  let plainMatch;
  const plainRegex = new RegExp(plainImageUrlPattern);
  while ((plainMatch = plainRegex.exec(processedContent)) !== null) {
    const beforeText = processedContent.substring(Math.max(0, plainMatch.index - 15), plainMatch.index);
    if (!beforeText.includes("__IMAGE__")) {
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

  const parts = processedContent.split(/(__IMAGE__[^_]+__ALT__[^_]+__)/);
  for (const part of parts) {
    if (part.startsWith("__IMAGE__")) {
      const [, url, alt] = part.match(/__IMAGE__([^_]+)__ALT__([^_]+)__/) || [];
      if (url) blocks.push({ type: "image", content: url, alt: alt || "画像" });
    } else if (part.trim()) {
      blocks.push({ type: "text", content: part });
    }
  }
  if (blocks.length === 0) {
    blocks.push({ type: "text", content: text });
  }
  return blocks;
}

/** `[動画](URL)` のみ iframe＋URL表示。通常の YouTube リンクは renderInlineMarkdown 側 */
function renderMarkdownLineOrVideo(line: string): React.ReactNode {
  const vm = matchVideoEmbedMarkdownLine(line);
  if (vm) {
    const url = vm[1];
    return (
      <span className="block w-full max-w-3xl mx-auto not-prose">
        <YouTubeEmbed url={url} title="埋め込み動画" />
        <span className="mt-2 block text-sm text-muted-foreground break-all">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            {url}
          </a>
        </span>
      </span>
    );
  }
  return renderInlineMarkdown(line);
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
    const normalized = trimmed.trim();

    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h3
          key={`md-${keyIndex++}`}
          className="mt-4 mb-2 text-xl font-bold text-foreground scroll-mt-20"
        >
          {renderInlineMarkdown(trimmed.slice(4))}
        </h3>
      );
      i += 1;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h2
          key={`md-${keyIndex++}`}
          className="mt-6 mb-3 text-2xl font-bold text-foreground scroll-mt-20"
        >
          {renderInlineMarkdown(trimmed.slice(3))}
        </h2>
      );
      i += 1;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      nodes.push(
        <h1
          key={`md-${keyIndex++}`}
          className="mt-8 mb-4 text-3xl font-bold text-foreground scroll-mt-20"
        >
          {renderInlineMarkdown(trimmed.slice(2))}
        </h1>
      );
      i += 1;
      continue;
    }

    if (normalized === "---") {
      nodes.push(<hr key={`md-${keyIndex++}`} className="my-8 border-t-2 border-gray-200" />);
      i += 1;
      continue;
    }

    // 空行はスキップ
    if (normalized === "") {
      i += 1;
      continue;
    }

    // 明示的な動画埋め込み行のみ iframe（ツールバー「動画化」で追加された [動画](URL)）
    if (matchVideoEmbedMarkdownLine(trimmed)) {
      nodes.push(
        <div key={`md-${keyIndex++}`} className="my-6">
          {renderMarkdownLineOrVideo(trimmed)}
        </div>
      );
      i += 1;
      continue;
    }

    // 箇条書き（- または * で始まる行）
    if (trimmed.startsWith("- ") || (trimmed.startsWith("* ") && trimmed.length > 2)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trimEnd();
        if (t === "") break;
        if (t.startsWith("- ")) items.push(t.slice(2));
        else if (t.startsWith("* ") && t.length > 2) items.push(t.slice(2));
        else break;
        i += 1;
      }
      if (items.length > 0) {
        nodes.push(
          <ul
            key={`md-${keyIndex++}`}
            className="list-disc list-inside text-base text-foreground leading-relaxed mb-4 space-y-1"
          >
            {items.map((item, j) => (
              <li key={j}>{renderMarkdownLineOrVideo(item)}</li>
            ))}
          </ul>
        );
      }
      continue;
    }

    // 番号付きリスト（1. 2. など）
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      const start = Math.max(1, Number(orderedMatch[1]));
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trimEnd();
        const m = t.match(/^\d+\.\s+(.*)$/);
        if (m) {
          items.push(m[1]);
          i += 1;
        } else if (t === "") {
          break;
        } else {
          break;
        }
      }
      if (items.length > 0) {
        nodes.push(
          <ol
            key={`md-${keyIndex++}`}
            start={start}
            className="list-decimal list-inside text-base text-foreground leading-relaxed mb-4 space-y-1"
          >
            {items.map((item, j) => (
              <li key={j}>{renderMarkdownLineOrVideo(item)}</li>
            ))}
          </ol>
        );
      }
      continue;
    }

    // 連続する通常行を1つの段落に（# / ## / ### / リストで始まる行は区切る）
    const isHeadingLine = (s: string) =>
      s.startsWith("# ") || s.startsWith("## ") || s.startsWith("### ");
    const isListLine = (s: string) =>
      s.startsWith("- ") || (s.startsWith("* ") && s.length > 2) || /^\d+\.\s+/.test(s);
    const isDividerLine = (s: string) => s.trim() === "---";
    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const ln = lines[i];
      const t = ln.trimEnd();
      if (t.trim() === "" || isHeadingLine(t) || isListLine(t) || isDividerLine(t)) break;
      paragraphLines.push(ln);
      i += 1;
    }
    if (paragraphLines.length > 0) {
      const paraText = paragraphLines.join("\n");
      nodes.push(
        <p
          key={`md-${keyIndex++}`}
          className="text-base text-foreground leading-relaxed mb-4 last:mb-0"
        >
          {paraText.split("\n").map((line, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <br />}
              {renderMarkdownLineOrVideo(line)}
            </React.Fragment>
          ))}
        </p>
      );
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
  const blocks = useMemo(
    () => parseContent(stripRawMarkdownPrefix(content)),
    [content]
  );
  
  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === "image") {
          return (
            <div
              key={index}
              className="my-6 relative w-full rounded-lg overflow-hidden bg-muted"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                <ImageWithUrlError
                  originalSrc={block.content}
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
            {looksLikeHtml(block.content) ? (
              <div
                className="article-html prose prose-neutral dark:prose-invert max-w-none break-words"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(block.content),
                }}
              />
            ) : (
              <MarkdownLikeContent text={block.content} />
            )}
          </div>
        );
      })}
    </div>
  );
}
