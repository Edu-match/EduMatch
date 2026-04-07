import { notFound } from "next/navigation";

/**
 * スレッド詳細ページ
 * モック段階ではURLから直接アクセスすると 404 になります。
 * DB 接続後に実装予定です。
 */
export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  notFound();
}
