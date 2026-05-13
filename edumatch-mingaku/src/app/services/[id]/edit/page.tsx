import { notFound, redirect } from "next/navigation";
import { requireProvider } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServiceEditForm } from "./service-edit-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ServiceEditPage({ params }: PageProps) {
  const { id } = await params;
  const { profile } = await requireProvider();
  if (!profile) redirect("/dashboard");

  // サービスを取得
  const service = await prisma.service.findUnique({
    where: { id },
    select: {
      id: true,
      provider_id: true,
      title: true,
      provider_display_name: true,
      provider_display_avatar_url: true,
      request_notification_emails: true,
      show_material_request_button: true,
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

  // 投稿者本人または ADMIN のみ編集可
  const isAdmin = profile.role === "ADMIN";
  if (service.provider_id !== profile.id && !isAdmin) {
    redirect("/dashboard");
  }

  const initialData = {
    title: service.title,
    provider_display_name: service.provider_display_name ?? "",
    provider_display_avatar_url: service.provider_display_avatar_url ?? "",
    request_notification_emails: (service.request_notification_emails ?? []).join("\n"),
    show_material_request_button: service.show_material_request_button ?? true,
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
