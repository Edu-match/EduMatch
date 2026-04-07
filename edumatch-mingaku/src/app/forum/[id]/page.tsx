import { notFound } from "next/navigation";
import { ForumThreadDetail } from "@/components/community/forum-thread-detail";
import { getForumThreadById, mockForumThreads } from "@/lib/mock-community";

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thread = getForumThreadById(id);

  if (!thread) {
    notFound();
  }

  const relatedThreads = mockForumThreads
    .filter((candidate) => candidate.id !== thread.id)
    .slice(0, 3);

  return <ForumThreadDetail thread={thread} relatedThreads={relatedThreads} />;
}
