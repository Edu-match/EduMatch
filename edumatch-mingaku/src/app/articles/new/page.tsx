import { requireAuth } from "@/lib/auth";
import { ArticleForm } from "./article-form";

export default async function ArticleSubmitPage() {
  // 認証チェック
  await requireAuth();
  
  return <ArticleForm />;
}
