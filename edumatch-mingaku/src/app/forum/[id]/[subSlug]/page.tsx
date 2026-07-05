import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ForumRoomClientDynamic } from "@/components/community/forum-room-client-dynamic";
import { getOrCreateCategoryRoom, lookupCategoryRoom } from "@/lib/forum-category-room";
import { getCategoryRoomContentForPage } from "@/lib/forum-category-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; subSlug: string }>;
}): Promise<Metadata> {
  const { id: categorySlug, subSlug } = await params;
  const result = await lookupCategoryRoom(categorySlug, subSlug);
  if (!result) return {};
  return {
    title: `${result.room.name} | AIUEO 教育のひろば | エデュマッチ`,
    description: result.room.description,
  };
}

export default async function ForumCategoryRoomPage({
  params,
}: {
  params: Promise<{ id: string; subSlug: string }>;
}) {
  const { id: categorySlug, subSlug } = await params;
  const result = await getOrCreateCategoryRoom(categorySlug, subSlug);
  if (!result) notFound();

  const { room, category, subCategory } = result;

  const items =
    subCategory.contentKind === "community"
      ? []
      : await getCategoryRoomContentForPage({
          categoryId: category.id,
          categoryName: category.name,
          categoryDescription: category.description,
          subCategoryId: subCategory.id,
          subCategoryName: subCategory.name,
          contentKind: subCategory.contentKind,
        });

  return (
    <ForumRoomClientDynamic
      room={room}
      categoryContext={{
        categoryId: category.id,
        subCategoryId: subCategory.id,
        categorySlug: category.slug,
        subCategorySlug: subCategory.slug,
        categoryName: category.name,
        subCategoryName: subCategory.name,
        contentKind: subCategory.contentKind,
        items,
      }}
    />
  );
}
