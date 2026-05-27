import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { VideoDetailClient, type VideoDetail } from "@/components/videos/video-detail-client";

export const dynamic = "force-dynamic";

async function getVideo(id: string): Promise<VideoDetail | null> {
  try {
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) return null;
    if (!video.is_published) {
      const profile = await getCurrentProfile();
      if (!profile || profile.role !== "ADMIN") return null;
    }
    return {
      id: video.id,
      title: video.title,
      description: video.description,
      youtubeUrl: video.youtube_url,
      youtubeId: video.youtube_id,
      aiSummary: video.ai_summary ?? null,
      isPublished: video.is_published,
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
    title: `${video.title} | 動画 | エデュマッチ`,
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
  return <VideoDetailClient video={video} />;
}
