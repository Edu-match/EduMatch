import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * 旧「教育AIサミット管理」。管理画面は「教育のひろば 管理」(/admin/forum) に統合したため、
 * ここはそちらへリダイレクトする（マップ/モデレーション/サイト設定もそのタブにある）。
 */
export default function InteropAdminPage() {
  redirect("/admin/forum");
}
