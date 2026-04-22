"use client";

import React from "react";
import type { Components } from "react-markdown";
import { YouTubeEmbed } from "@/components/ui/youtube-embed";
import { matchVideoEmbedMarkdownLine } from "@/lib/video-embed-markdown";

export function linkChildrenToText(children: React.ReactNode): string {
  if (children == null || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(linkChildrenToText).join("");
  if (React.isValidElement(children)) {
    const p = children.props as { children?: React.ReactNode };
    if (p?.children !== undefined) return linkChildrenToText(p.children);
  }
  return "";
}

/**
 * ReactMarkdown 用: `[動画](YouTubeのURL)` だけ iframe＋URL表示。それ以外は通常の <a>
 */
export function markdownAnchorWithVideoEmbed(): Pick<Components, "a"> {
  return {
    a: ({ href, children, ...props }) => {
      const label = linkChildrenToText(children).trim();
      const line = href ? `[${label}](${href})` : "";
      if (href && label === "動画" && matchVideoEmbedMarkdownLine(line)) {
        return (
          <span className="block my-4 not-prose w-full max-w-3xl mx-auto">
            <YouTubeEmbed url={href} title="動画" />
            <p className="mt-2 text-sm text-muted-foreground break-all">
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
                {...props}
              >
                {href}
              </a>
            </p>
          </span>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-700"
          {...props}
        >
          {children}
        </a>
      );
    },
  };
}
