/** Prisma エラーからフォーラム API 向けの日本語ヒントを返す */
export function forumPrismaErrorMessage(err: unknown): string | null {
  const code = (err as { code?: string })?.code;
  const message = String((err as { message?: string })?.message ?? "");

  if (code === "P2021") {
    return "forum_categories テーブルがありません。Supabase SQL でマイグレーションを実行してください。";
  }

  if (
    code === "P2022" ||
    message.includes("column `tags`") ||
    message.includes('column "tags"')
  ) {
    return "forum_categories.tags 列がありません。supabase/migrations/20260601000000_forum_category_tags.sql を実行してください。";
  }

  return null;
}
