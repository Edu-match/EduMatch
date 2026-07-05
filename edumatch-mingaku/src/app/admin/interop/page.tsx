import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * 旧「教育AIサミット管理」。マップ/モデレーション/サイト設定は「教育のひろば 管理」(/admin/forum)
 * のタブに統合したため、ここはリダイレクトする。
 */
export default function AdminInteropPage() {
  redirect("/admin/forum");
}
