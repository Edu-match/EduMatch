"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { contentToBlocks } from "@/lib/markdown-to-blocks";
import { renderInlineMarkdown } from "@/lib/inline-markdown";
import {
  isImportedContent,
  parseImportedContent,
} from "@/lib/imported-content";
import { ImportedContentRenderer } from "@/components/content/imported-content-renderer";
function extractYouTubeId(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  );
  return match ? match[1] : "";
}

/**
 * ブロック形式のコンテンツ（Markdown）をプレビュー表示する
 */
export function BlocksContentPreview({ content }: { content: string }) {
  if (isImportedContent(content)) {
    const parsed = parseImportedContent(content);
    return parsed ? (
      <ImportedContentRenderer
        type={parsed.type}
        content={parsed.raw}
        className="min-h-[120px]"
      />
    ) : null;
  }

  const blocks = contentToBlocks(content);
  if (blocks.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        コンテンツがありません
      </p>
    );
  }

  return (
    <div className="prose prose-lg max-w-none">
      {blocks.map((block) => {
        switch (block.type) {
          case "heading1":
            return (
              <h2
                key={block.id}
                className="text-3xl font-normal mt-8 mb-4 [&_strong]:font-bold"
                style={{ textAlign: block.align }}
              >
                {renderInlineMarkdown(block.content)}
              </h2>
            );
          case "heading2":
            return (
              <h3
                key={block.id}
                className="text-2xl font-normal mt-6 mb-3 [&_strong]:font-bold"
                style={{ textAlign: block.align }}
              >
                {renderInlineMarkdown(block.content)}
              </h3>
            );
          case "heading3":
            return (
              <h4
                key={block.id}
                className="text-xl font-normal mt-4 mb-2 [&_strong]:font-bold"
                style={{ textAlign: block.align }}
              >
                {renderInlineMarkdown(block.content)}
              </h4>
            );
          case "paragraph":
            return (
              <p
                key={block.id}
                className="mb-4 leading-relaxed"
                style={{ textAlign: block.align }}
              >
                {renderInlineMarkdown(block.content)}
              </p>
            );
          case "image":
            return (
              <figure key={block.id} className="my-8">
                {block.url && (
                  <img
                    src={block.url}
                    alt={block.caption || ""}
                    className="w-full rounded-lg"
                  />
                )}
                {block.caption && (
                  <figcaption className="text-center text-sm text-muted-foreground mt-2">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          case "video":
            return (
              <figure key={block.id} className="my-8">
                {block.url && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe
                      src={
                        block.url.includes("youtube.com") ||
                        block.url.includes("youtu.be")
                          ? `https://www.youtube.com/embed/${extractYouTubeId(block.url)}`
                          : block.url
                      }
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                )}
                {block.caption && (
                  <figcaption className="text-center text-sm text-muted-foreground mt-2">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          case "quote":
            return (
              <blockquote
                key={block.id}
                className="border-l-4 border-primary pl-4 my-6 italic"
              >
                <p className="text-lg">{renderInlineMarkdown(block.content)}</p>
                {block.caption && (
                  <cite className="text-sm text-muted-foreground not-italic">
                    — {block.caption}
                  </cite>
                )}
              </blockquote>
            );
          case "divider":
            return <hr key={block.id} className="my-8 border-t-2" />;
          case "bulletList":
            return (
              <ul key={block.id} className="list-disc pl-6 my-4 space-y-1">
                {block.items?.map((item, i) => (
                  <li key={i}>{renderInlineMarkdown(item)}</li>
                ))}
              </ul>
            );
          case "numberedList":
            return (
              <ol key={block.id} className="list-decimal pl-6 my-4 space-y-1">
                {block.items?.map((item, i) => (
                  <li key={i}>{renderInlineMarkdown(item)}</li>
                ))}
              </ol>
            );
          case "markdown": {
            const text = block.content ?? "";
            const lines = text.split(/\n/);
            return (
              <div key={block.id} className="prose prose-lg max-w-none my-4 space-y-0">
                {lines.map((line, i) =>
                  line === "" ? (
                    <div key={i} className="min-h-[1em]" aria-hidden />
                  ) : (
                    <div key={i} className="py-0.5">
                      <ReactMarkdown remarkPlugins={[remarkBreaks]}>{line}</ReactMarkdown>
                    </div>
                  )
                )}
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
