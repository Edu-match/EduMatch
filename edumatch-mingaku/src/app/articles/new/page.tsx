import { requireProvider } from "@/lib/auth";
import { ArticleForm } from "./article-form";

export default async function ArticleSubmitPage() {
  await requireProvider();
  return <ArticleForm />;
}
