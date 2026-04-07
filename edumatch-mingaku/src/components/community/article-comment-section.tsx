import { CommentSection } from "./comment-section";

export function ArticleCommentSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">コメント</h2>
      <CommentSection
        placeholder="記事の感想・補足・実践への応用など、気軽にコメントしてください"
        submitLabel="コメントを投稿"
        emptyMessage="まだコメントはありません。最初のコメントをしてみましょう。"
      />
    </div>
  );
}
