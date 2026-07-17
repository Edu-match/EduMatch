import { redirect } from "next/navigation";

/**
 * 旧・サービス投稿ルート。
 * 投稿フローは /services/create に一本化したため、
 * 旧リンク・ブックマークからのアクセスは正ルートへリダイレクトする。
 */
export default function ServiceSubmitPage() {
  redirect("/services/create");
}
