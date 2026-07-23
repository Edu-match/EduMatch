import { redirect } from "next/navigation";

/**
 * 旧・記事投稿ルート。
 * 投稿フローは /articles/create（AI生成・下書き対応のクライアント実装）に一本化したため、
 * 旧リンク・ブックマークからのアクセスは正ルートへリダイレクトする。
 */
export default function ArticleSubmitPage() {
  redirect("/articles/create");
}
