import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InteropBoard } from "@/components/interop/interop-board";
import { InteropGeofence } from "@/components/interop/interop-geofence";
import { getInteropSettings } from "@/lib/interop-settings.server";

export const dynamic = "force-dynamic";

async function loadTopicWithSub(subId: string, topicId: string) {
  try {
    return await prisma.interopBoardTopic.findFirst({
      where: { id: topicId, sub_category_id: subId, is_active: true },
      include: {
        subCategory: {
          include: { category: { select: { id: true, name: true, color: true, slug: true } } },
        },
      },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subId: string; topicId: string }>;
}): Promise<Metadata> {
  const { subId, topicId } = await params;
  const topic = await loadTopicWithSub(subId, topicId);
  if (!topic) return { title: "教育AIサミット | Interop Tokyo 2026" };
  return {
    title: `${topic.name} | ${topic.subCategory.name} | 教育AIサミット`,
    description: topic.description || `${topic.subCategory.name} - ${topic.name}`,
  };
}

export default async function InteropTopicBoardPage({
  params,
}: {
  params: Promise<{ subId: string; topicId: string }>;
}) {
  const { subId, topicId } = await params;
  const topic = await loadTopicWithSub(subId, topicId);
  if (!topic) notFound();
  const sub = topic.subCategory;

  const settings = await getInteropSettings();

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
        topic={{
          id: topic.id,
          name: topic.name,
          description: topic.description,
          url: topic.url,
        }}
        accent={sub.category.color || "#9fb4e8"}
        themeMode={settings.themeMode}
      />
      <InteropGeofence settings={settings} />
    </>
  );
}
