"use server";

import { prisma } from "@/lib/prisma";

export type ChatContextItem = {
  id: string;
  type: "article" | "service";
  title: string;
  content: string;
};

function stripHtml(html: string): string {
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

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "…";
}

const MAX_CONTEXT_CHARS = 6000;

export async function getArticleContextForChat(
  id: string
): Promise<ChatContextItem | null> {
  try {
    const post = await prisma.post.findFirst({
      where: {
        id,
        OR: [{ status: "APPROVED" }, { is_published: true }],
      },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        tags: true,
        summary: true,
      },
    });
    if (!post) return null;

    const parts: string[] = [];
    parts.push(`タイトル: ${post.title}`);
    if (post.category) parts.push(`カテゴリ: ${post.category}`);
    if (post.tags && post.tags.length > 0)
      parts.push(`タグ: ${post.tags.join(", ")}`);
    if (post.summary) parts.push(`要約: ${post.summary}`);
    if (post.content) parts.push(`\n本文:\n${stripHtml(post.content)}`);

    return {
      id: post.id,
      type: "article",
      title: post.title,
      content: truncate(parts.join("\n"), MAX_CONTEXT_CHARS),
    };
  } catch (error) {
    console.error("getArticleContextForChat error:", error);
    return null;
  }
}

export async function getServiceContextForChat(
  id: string
): Promise<ChatContextItem | null> {
  try {
    const service = await prisma.service.findFirst({
      where: {
        id,
        OR: [{ status: "APPROVED" }, { is_published: true }],
      },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        category: true,
        tags: true,
        price_info: true,
        provider: { select: { name: true } },
      },
    });
    if (!service) return null;

    const parts: string[] = [];
    parts.push(`サービス名: ${service.title}`);
    if (service.provider?.name)
      parts.push(`提供者: ${service.provider.name}`);
    if (service.category) parts.push(`カテゴリ: ${service.category}`);
    if (service.tags && service.tags.length > 0)
      parts.push(`タグ: ${service.tags.join(", ")}`);
    if (service.description) parts.push(`概要: ${service.description}`);
    if (service.price_info) parts.push(`料金: ${service.price_info}`);
    if (service.content) parts.push(`\n詳細:\n${stripHtml(service.content)}`);

    return {
      id: service.id,
      type: "service",
      title: service.title,
      content: truncate(parts.join("\n"), MAX_CONTEXT_CHARS),
    };
  } catch (error) {
    console.error("getServiceContextForChat error:", error);
    return null;
  }
}
