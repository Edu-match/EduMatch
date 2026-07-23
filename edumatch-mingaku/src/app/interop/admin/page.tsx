import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * 旧「教育AIサミット管理」。管理画面は「井戸端会議 管理」(/admin/forum) に統合したため、
 * ここはそちらへリダイレクトする（マップ/モデレーション/サイト設定もそのタブにある）。
 */
export default function InteropAdminPage() {
  redirect("/admin/forum");
}
