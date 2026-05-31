import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ForumRoomClientDynamic } from "@/components/community/forum-room-client-dynamic";
import { getOrCreateCategoryRoom } from "@/lib/forum-category-room";
import { getCategoryRoomContent } from "@/lib/forum-category-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; subSlug: string }>;
}): Promise<Metadata> {
  const { categorySlug, subSlug } = await params;
  const result = await getOrCreateCategoryRoom(categorySlug, subSlug);
  if (!result) return {};
  return {
    title: `${result.room.name} | AIUEO 井戸端会議 | エデュマッチ`,
    description: result.room.description,
  };
}

export default async function ForumCategoryRoomPage({
  params,
}: {
  params: Promise<{ categorySlug: string; subSlug: string }>;
}) {
  const { categorySlug, subSlug } = await params;
  const result = await getOrCreateCategoryRoom(categorySlug, subSlug);
  if (!result) notFound();

  const { room, category, subCategory } = result;

  // community 以外は関連DBコンテンツを取得して上部に表示
  const items =
    subCategory.contentKind === "community"
      ? []
      : await getCategoryRoomContent(category.name, subCategory.contentKind);

  return (
    <ForumRoomClientDynamic
      room={room}
      categoryContext={{
        categorySlug: category.slug,
        categoryName: category.name,
        subCategoryName: subCategory.name,
        contentKind: subCategory.contentKind,
        items,
      }}
    />
  );
}
