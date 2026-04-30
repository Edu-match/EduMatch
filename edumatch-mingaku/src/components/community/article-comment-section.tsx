"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommentSection } from "./comment-section";
import { FORUM_ROOMS } from "@/lib/mock-forum";

const FORUM_DRAFT_STORAGE_KEY = "edumatch-forum-post-draft";

export function ArticleCommentSection({ articleTitle }: { articleTitle: string }) {
  const router = useRouter();
  const [selectedRoomId, setSelectedRoomId] = useState(FORUM_ROOMS[0]?.id ?? "");
  const [latestComment, setLatestComment] = useState("");
  const selectedRoom = useMemo(
    () => FORUM_ROOMS.find((room) => room.id === selectedRoomId),
    [selectedRoomId]
  );

  function moveTopicToForum() {
    if (!selectedRoomId || !latestComment.trim()) return;
    const draftBody = `【記事からの話題】${articleTitle}\n\n${latestComment.trim()}`;
    try {
      localStorage.setItem(
        FORUM_DRAFT_STORAGE_KEY,
        JSON.stringify({
          roomId: selectedRoomId,
          body: draftBody,
          createdAt: Date.now(),
          source: "article-comment",
        })
      );
      window.dispatchEvent(new CustomEvent("edumatch:forum-draft-created"));
    } catch {
      // localStorage が使えない環境では遷移のみ実施
    }
    router.push(`/forum/${selectedRoomId}#new-post`);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">コメント</h2>
      <CommentSection
        placeholder="記事の感想・補足・実践への応用など、気軽にコメントしてください"
        submitLabel="コメントを投稿"
        emptyMessage="まだコメントはありません。最初のコメントをしてみましょう。"
        onCommentPosted={(body) => setLatestComment(body)}
      />
      <div className="rounded-lg border bg-violet-50/70 px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-medium text-violet-900">
          <MessageCircle className="h-3.5 w-3.5" />
          このコメントを井戸端会議の話題として投稿
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
            <SelectTrigger className="h-8 sm:w-72">
              <SelectValue placeholder="投稿先の部屋を選択" />
            </SelectTrigger>
            <SelectContent>
              {FORUM_ROOMS.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            className="h-8 sm:ml-auto"
            disabled={!latestComment.trim() || !selectedRoomId}
            onClick={moveTopicToForum}
          >
            <Send className="mr-1 h-3.5 w-3.5" />
            井戸端会議へ持っていく
          </Button>
        </div>
        <p className="mt-1 text-[11px] text-violet-700/80">
          {selectedRoom ? `投稿先: ${selectedRoom.name}` : "投稿先を選択してください"}
        </p>
      </div>
    </div>
  );
}
