"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { contentToBlocks } from "@/lib/markdown-to-blocks";
import { renderInlineMarkdown } from "@/lib/inline-markdown";
import { isImportedContent, parseImportedContent } from "@/lib/imported-content";
import { ImportedContentRenderer } from "@/components/content/imported-content-renderer";
import { extractYouTubeId } from "@/lib/youtube-id";

export interface ArticlePreviewProps {
  title: string;
  leadText: string;
  content: string;
  category: string;
  thumbnailUrl?: string;
}

export function ArticlePreview({
  title,
  leadText,
  content,
  category,
  thumbnailUrl,
}: ArticlePreviewProps) {
  return (
    <div className="max-w-3xl mx-auto">
      {thumbnailUrl ? (
        <div className="mb-6 rounded-xl overflow-hidden">
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-[300px] object-contain"
          />
        </div>
      ) : null}

      <h1 className="text-4xl font-bold mb-4">{title || "タイトル未設定"}</h1>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString("ja-JP")}
        </span>
        {category ? <Badge variant="outline">{category}</Badge> : null}
      </div>

      {leadText ? (
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          {leadText}
        </p>
      ) : null}

      {isImportedContent(content) ? (
        (() => {
          const parsed = parseImportedContent(content);
          return parsed ? (
            <ImportedContentRenderer type={parsed.type} content={parsed.raw} />
          ) : null;
        })()
      ) : (
        <div className="prose prose-lg max-w-none">
          {contentToBlocks(content).map((block) => {
            switch (block.type) {
              case "heading1":
                return (
                  <h2
                    key={block.id}
                    className="text-3xl font-bold mt-8 mb-4"
                    style={{ textAlign: block.align }}
                  >
                    {renderInlineMarkdown(block.content)}
                  </h2>
                );
              case "heading2":
                return (
                  <h3
                    key={block.id}
                    className="text-2xl font-bold mt-6 mb-3"
                    style={{ textAlign: block.align }}
                  >
                    {renderInlineMarkdown(block.content)}
                  </h3>
                );
              case "heading3":
                return (
                  <h4
                    key={block.id}
                    className="text-xl font-semibold mt-4 mb-2"
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
                    {block.url ? (
                      <img
                        src={block.url}
                        alt={block.caption || ""}
                        className="w-full rounded-lg"
                      />
                    ) : null}
                    {block.caption ? (
                      <figcaption className="text-center text-sm text-muted-foreground mt-2">
                        {block.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                );
              case "video":
                return (
                  <figure key={block.id} className="my-8">
                    {block.url ? (
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
                    ) : null}
                    {block.caption ? (
                      <figcaption className="text-center text-sm text-muted-foreground mt-2">
                        {block.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                );
              case "quote":
                return (
                  <blockquote
                    key={block.id}
                    className="border-l-4 border-primary pl-4 my-6 italic"
                  >
                    <p className="text-lg">{renderInlineMarkdown(block.content)}</p>
                    {block.caption ? (
                      <cite className="text-sm text-muted-foreground not-italic">
                        — {block.caption}
                      </cite>
                    ) : null}
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
              case "markdown":
                return (
                  <div key={block.id} className="prose prose-lg max-w-none my-4">
                    <ReactMarkdown>{block.content}</ReactMarkdown>
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>
      )}
    </div>
  );
}
