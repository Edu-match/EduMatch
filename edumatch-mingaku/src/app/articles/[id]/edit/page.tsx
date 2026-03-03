import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArticleEditForm } from "./article-edit-form";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function ArticleEditPage({ params }: PageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");

  // PROVIDER または ADMIN のみアクセス可
  if (profile.role !== "PROVIDER" && profile.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // 記事を取得
  const article = await prisma.post.findUnique({
    where: { id: params.id },
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

  // ADMIN でなければ投稿者本人かチェック
  if (profile.role !== "ADMIN" && article.provider_id !== profile.id) {
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

  return <ArticleEditForm articleId={article.id} initialData={initialData} />;
}
