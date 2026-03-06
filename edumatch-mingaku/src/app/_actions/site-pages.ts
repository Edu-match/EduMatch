"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import type { ContentBlock } from "@/components/editor/block-editor";
import { blocksToMarkdown } from "@/lib/markdown-to-blocks";
import { contentToBlocks } from "@/lib/markdown-to-blocks";
import { isImportedContent } from "@/lib/imported-content";

export type SitePageKey = "terms" | "privacy" | "service_content";

const DEFAULT_TITLES: Record<SitePageKey, string> = {
  terms: "利用規約",
  privacy: "プライバシーポリシー",
  service_content: "サービス内容一覧",
};

export async function getSitePage(key: SitePageKey) {
  try {
    const page = await prisma.sitePage.findUnique({
      where: { key },
    });
    return page ?? { id: null, key, title: DEFAULT_TITLES[key], body: "" };
  } catch (e) {
    console.error("getSitePage error:", e);
    return { id: null, key, title: DEFAULT_TITLES[key], body: "" };
  }
}

export async function upsertSitePage(
  key: SitePageKey,
  data: { title: string; body: string }
) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return { success: false as const, error: "管理者権限が必要です" };
  }
  try {
    const page = await prisma.sitePage.upsert({
      where: { key },
      create: { key, title: data.title, body: data.body },
      update: { title: data.title, body: data.body },
    });
    return { success: true as const, id: page.id };
  } catch (e) {
    console.error("upsertSitePage error:", e);
    return { success: false as const, error: "保存に失敗しました" };
  }
}

export async function getSitePageBlocks(key: SitePageKey): Promise<ContentBlock[]> {
  const page = await getSitePage(key);
  if (!page.body?.trim()) return [];
  return contentToBlocks(page.body);
}

export async function updateSitePageBlocks(
  key: SitePageKey,
  blocks: ContentBlock[],
  title?: string
) {
  const body = blocksToMarkdown(blocks);
  const page = await getSitePage(key);
  const newTitle = title ?? page.title;
  return upsertSitePage(key, { title: newTitle, body });
}

export async function updateSitePageContent(
  key: SitePageKey,
  content: string,
  title?: string
) {
  const body =
    isImportedContent(content) ? content : blocksToMarkdown(contentToBlocks(content));
  const page = await getSitePage(key);
  const newTitle = title ?? page.title;
  return upsertSitePage(key, { title: newTitle, body });
}
