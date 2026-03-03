import { notFound, redirect } from "next/navigation";
import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArticleEditBlockForm } from "./article-edit-block-form";

export default async function ArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { profile } = await requireProvider();
  if (!profile) redirect("/dashboard");

  // 記事を取得
  const article = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      provider_id: true,
      title: true,
      category: true,
      tags: true,
      summary: true,
      content: true,
      thumbnail_url: true,
      youtube_url: true,
      status: true,
    },
  });

  if (!article) {
    notFound();
  }

  // 投稿者本人または ADMIN のみ編集可
  const isAdmin = profile.role === "ADMIN";
  if (article.provider_id !== profile.id && !isAdmin) {
    redirect("/dashboard");
  }

  const initialData = {
    title: article.title,
    category: article.category,
    tags: article.tags,
    summary: article.summary || "",
    content: article.content,
    thumbnail_url: article.thumbnail_url,
    youtube_url: article.youtube_url,
    status: article.status || "PENDING",
  };

  return <ArticleEditBlockForm articleId={article.id} initialData={initialData} />;
}
