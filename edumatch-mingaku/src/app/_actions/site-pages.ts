"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import type { ContentBlock } from "@/components/editor/block-editor";
import { blocksToMarkdown } from "@/lib/markdown-to-blocks";
import { contentToBlocks } from "@/lib/markdown-to-blocks";
import { isImportedContent } from "@/lib/imported-content";
import { getDefaultContentForEdit } from "@/lib/default-site-pages";

export type SitePageKey =
  | "terms"
  | "privacy"
  | "service_content"
  | "faq"
  | "about"
  | "company_info";

const DEFAULT_TITLES: Record<SitePageKey, string> = {
  terms: "利用規約",
  privacy: "プライバシーポリシー",
  service_content: "サービス内容一覧",
  faq: "よくある質問",
  about: "運営について",
  company_info: "会社情報",
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

/** 公開ページ用：よくある質問のカテゴリ一覧を取得。body が空または不正な場合はデフォルトを返す。 */
export async function getFaqCategories(): Promise<FaqCategoryPublic[]> {
  const page = await getSitePage("faq");
  if (!page.body?.trim()) {
    return getDefaultFaqCategories();
  }
  try {
    const data = JSON.parse(page.body) as unknown;
    if (!Array.isArray(data)) return getDefaultFaqCategories();
    return data.map((c: unknown) => {
      const cat = c as Record<string, unknown>;
      return {
        id: String(cat.id ?? ""),
        title: String(cat.title ?? ""),
        icon: String(cat.icon ?? "HelpCircle"),
        faqs: Array.isArray(cat.faqs)
          ? (cat.faqs as { question: string; answer: string }[]).map((f) => ({
              question: String(f?.question ?? ""),
              answer: String(f?.answer ?? ""),
            }))
          : [],
      };
    });
  } catch {
    return getDefaultFaqCategories();
  }
}

type FaqCategoryPublic = {
  id: string;
  title: string;
  icon: string;
  faqs: { question: string; answer: string }[];
};

function getDefaultFaqCategories(): FaqCategoryPublic[] {
  const json = getDefaultContentForEdit("faq", null);
  try {
    const data = JSON.parse(json) as unknown;
    return Array.isArray(data) ? (data as FaqCategoryPublic[]) : [];
  } catch {
    return [];
  }
}

/** FAQ など JSON をそのまま保存する固定ページ用。body をそのまま DB に保存する。 */
export async function updateSitePageBody(
  key: SitePageKey,
  body: string,
  title?: string
) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return { success: false as const, error: "管理者権限が必要です" };
  }
  const page = await getSitePage(key);
  const newTitle = title ?? page.title;
  return upsertSitePage(key, { title: newTitle, body });
}
