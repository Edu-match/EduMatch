import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const categoryListSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  color: true,
  sort_order: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.ForumCategorySelect;

type CategoryListRow = Prisma.ForumCategoryGetPayload<{
  select: typeof categoryListSelect;
}>;

function isMissingTagsColumn(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const message = String((err as { message?: string })?.message ?? "");
  return (
    code === "P2022" ||
    message.includes("column `tags`") ||
    message.includes('column "tags"')
  );
}

/** tags 列未適用の DB でも一覧取得できるようフォールバック付き */
export async function findForumCategoriesList(args: {
  where: Prisma.ForumCategoryWhereInput;
  orderBy: Prisma.ForumCategoryOrderByWithRelationInput[];
}): Promise<Array<CategoryListRow & { tags: string[] }>> {
  try {
    const rows = await prisma.forumCategory.findMany({
      where: args.where,
      orderBy: args.orderBy,
    });
    return rows.map((r) => ({ ...r, tags: r.tags ?? [] }));
  } catch (err) {
    if (!isMissingTagsColumn(err)) throw err;
    const rows = await prisma.forumCategory.findMany({
      where: args.where,
      orderBy: args.orderBy,
      select: categoryListSelect,
    });
    return rows.map((r) => ({ ...r, tags: [] as string[] }));
  }
}
