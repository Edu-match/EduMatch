import type { CommunityComment } from "@/lib/mock-community";
import { CommentSection } from "./comment-section";

export function ArticleCommentSection({
  comments,
}: {
  comments: CommunityComment[];
}) {
  return (
    <CommentSection
      title="記事へのコメント"
      description="記事の感想や実践への応用、補足情報などを気軽に共有できます。"
      initialComments={comments}
      emptyMessage="まだコメントはありません。最初の感想を投稿してみましょう。"
      composerTitle="この記事にコメントする"
      composerDescription="投稿者属性の選択や匿名投稿に対応したモックUIです。"
      submitLabel="コメントを投稿"
    />
  );
}
