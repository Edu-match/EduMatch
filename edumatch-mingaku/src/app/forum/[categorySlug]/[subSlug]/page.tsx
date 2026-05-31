import type { Metadata } from "next";
import Link from "next/link";
import { ForumRoomClientDynamic } from "@/components/community/forum-room-client-dynamic";
import { getOrCreateCategoryRoom } from "@/lib/forum-category-room";
import { getCategoryRoomContent } from "@/lib/forum-category-content";
import { prisma } from "@/lib/prisma";

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
  if (!result) {
    // 404の切り分け: ルートは存在しているので、slug不一致かDB作成失敗を表示する
    const [category, subCategory] = await Promise.all([
      prisma.forumCategory.findUnique({
        where: { slug: categorySlug },
        select: { id: true, name: true, slug: true },
      }),
      prisma.forumSubCategory.findUnique({
        where: { slug: subSlug },
        select: { id: true, name: true, slug: true },
      }),
    ]).catch(() => [null, null] as const);

    return (
      <div className="container py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-6">
          <h1 className="text-xl font-bold">カテゴリルームを開けませんでした</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ページのルート自体は存在しますが、カテゴリ情報の取得または部屋作成に失敗しています。
          </p>
          <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs">
            <p>
              categorySlug: <span className="font-mono">{categorySlug}</span>
            </p>
            <p>
              subSlug: <span className="font-mono">{subSlug}</span>
            </p>
            <p>
              category found: <span className="font-mono">{category ? "yes" : "no"}</span>
            </p>
            <p>
              subCategory found: <span className="font-mono">{subCategory ? "yes" : "no"}</span>
            </p>
          </div>
          <div className="mt-4">
            <Link href="/forum" className="text-sm text-primary hover:underline">
              井戸端会議トップに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
