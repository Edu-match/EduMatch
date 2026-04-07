import { ForumClient } from "@/components/community/forum-client";
import { mockForumThreads } from "@/lib/mock-community";

export default function ForumPage() {
  return <ForumClient initialThreads={mockForumThreads} />;
}
