import type { Metadata } from "next";
import { VideoListClient } from "@/components/videos/video-list-client";

export const metadata: Metadata = {
  title: "動画 | エデュマッチ",
  description:
    "教育関係者向けに運営が厳選した動画。AIによる要約・コメント機能つきで、ポイントを素早く把握しながら議論できます。",
};

export default function VideosPage() {
  return <VideoListClient />;
}
