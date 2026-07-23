import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { VideoDetailClient, type VideoDetail } from "@/components/videos/video-detail-client";
import { isVideoViewableByVisitor } from "@/lib/video-visibility";

/** 動画タイトル・説明からキーワード一致でフォーラムカテゴリを推定し community ルームの href を返す */
async function resolveForumHref(title: string, description: string): Promise<string> {
  try {
    const categories = await prisma.forumCategory.findMany({
      where: { is_active: true },
      select: { slug: true, name: true, description: true },
      orderBy: { sort_order: "asc" },
    });
    if (categories.length === 0) return "/forum";
    const haystack = `${title} ${description}`.toLowerCase();
    const match = categories.find((cat) => {
      const parts = cat.name.normalize("NFKC").toLowerCase().split(/[\s・、]+/);
      return parts.some((p) => p.length >= 2 && haystack.includes(p));
    });
    const slug = (match ?? categories[0]).slug;
    return `/forum/${slug}/community`;
  } catch {
    return "/forum";
  }
}

export const dynamic = "force-dynamic";

async function getVideo(id: string): Promise<VideoDetail | null> {
  try {
    const profile = await getCurrentProfile();
    const isAdmin = profile?.role === "ADMIN";

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) return null;
    if (!isVideoViewableByVisitor(video.visibility, isAdmin)) return null;

    return {
      id: video.id,
      title: video.title,
      description: video.description,
      youtubeUrl: video.youtube_url,
      youtubeId: video.youtube_id,
      aiSummary: video.ai_summary ?? null,
      visibility: video.visibility,
      createdAt: video.created_at.toISOString(),
    };
  } catch (e) {
    console.error("[videos/:id getVideo]", e);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) return {};
  return {
    title: `${video.title} | 学びの動画 | エデュマッチ`,
    description: video.aiSummary?.slice(0, 140) || video.description.slice(0, 140) || undefined,
  };
}

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) notFound();
  const forumHref = await resolveForumHref(video.title, video.description);
  return <VideoDetailClient video={video} forumHref={forumHref} />;
}
