import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InteropBoard } from "@/components/interop/interop-board";
import { InteropTopicSelect } from "@/components/interop/interop-topic-select";
import { InteropGeofence } from "@/components/interop/interop-geofence";
import { getInteropSettings } from "@/lib/interop-settings.server";

export const dynamic = "force-dynamic";

async function loadSub(subId: string) {
  try {
    return await prisma.interopSubCategory.findFirst({
      where: { id: subId, is_active: true },
      include: { category: { select: { id: true, name: true, color: true, slug: true } } },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subId: string }>;
}): Promise<Metadata> {
  const { subId } = await params;
  const sub = await loadSub(subId);
  if (!sub) return { title: "教育AIサミット | Interop Tokyo 2026" };
  return {
    title: `${sub.name} | 教育AIサミット`,
    description: sub.description || `${sub.category.name} - ${sub.name}`,
  };
}

export default async function InteropSubPage({
  params,
}: {
  params: Promise<{ subId: string }>;
}) {
  const { subId } = await params;
  const sub = await loadSub(subId);
  if (!sub) notFound();

  const settings = await getInteropSettings();

  // トピックが1件でも設定されていれば「トピック選択」を入口にする。
  // 未設定なら従来どおり直接投稿ページ（掲示板）へ。
  const topics = await prisma.interopBoardTopic
    .findMany({
      where: { sub_category_id: sub.id, is_active: true },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
      select: { id: true, name: true, description: true },
    })
    .catch(() => []);

  if (topics.length > 0) {
    const counts = await prisma.interopPost
      .groupBy({
        by: ["topic_id"],
        where: {
          sub_category_id: sub.id,
          is_hidden: false,
          is_ai_reply: false,
          parent_post_id: null,
          topic_id: { in: topics.map((t) => t.id) },
        },
        _count: { _all: true },
      })
      .catch(() => [] as Array<{ topic_id: string | null; _count: { _all: number } }>);
    const countMap = new Map(counts.map((c) => [c.topic_id, c._count._all]));

    return (
      <>
        <InteropTopicSelect
          sub={{
            id: sub.id,
            name: sub.name,
            description: sub.description,
            categoryName: sub.category.name,
            categorySlug: sub.category.slug,
          }}
          topics={topics.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            postCount: countMap.get(t.id) ?? 0,
          }))}
          accent={sub.category.color || "#9fb4e8"}
          themeMode={settings.themeMode}
        />
        <InteropGeofence settings={settings} />
      </>
    );
  }

  return (
    <>
      <InteropBoard
        sub={{
          id: sub.id,
          name: sub.name,
          description: sub.description,
          url: sub.url,
          categoryId: sub.category.id,
          categoryName: sub.category.name,
          categorySlug: sub.category.slug,
        }}
        accent={sub.category.color || "#9fb4e8"}
        themeMode={settings.themeMode}
      />
      <InteropGeofence settings={settings} />
    </>
  );
}
