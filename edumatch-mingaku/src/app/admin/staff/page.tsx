import { requireAdmin } from "@/lib/auth";
import { getProfiles } from "@/app/_actions/staff-admin";
import { StaffManager } from "./staff-manager";

export default async function StaffAdminPage() {
  await requireAdmin();
  const profiles = await getProfiles();

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">スタッフ権限管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ユーザーのスタッフ権限を管理します
        </p>
      </div>
      <StaffManager initialProfiles={profiles} />
    </div>
  );
}
