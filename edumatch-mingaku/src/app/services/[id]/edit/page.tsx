import { notFound, redirect } from "next/navigation";
import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServiceEditForm } from "./service-edit-form";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function ServiceEditPage({ params }: PageProps) {
  const { profile } = await requireProvider();
  if (!profile) redirect("/dashboard");

  // サービスを取得
  const service = await prisma.service.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      provider_id: true,
      title: true,
      description: true,
      category: true,
      content: true,
      price_info: true,
      thumbnail_url: true,
      youtube_url: true,
      status: true,
    },
  });

  if (!service) {
    notFound();
  }

  // 投稿者本人かチェック
  if (service.provider_id !== profile.id) {
    redirect("/dashboard");
  }

  const initialData = {
    title: service.title,
    description: service.description,
    category: service.category,
    content: service.content,
    price_info: service.price_info || "",
    thumbnail_url: service.thumbnail_url,
    youtube_url: service.youtube_url,
    status: service.status || "PENDING",
  };

  return <ServiceEditForm serviceId={service.id} initialData={initialData} />;
}
