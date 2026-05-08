import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserRole } from "@/app/_actions/user";
import {
  getServicesForAdminDisplayOrder,
  updateServiceDisplayOrder,
} from "@/app/_actions/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function AdminServiceDisplayOrderPage() {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  const services = await getServicesForAdminDisplayOrder();

  async function updateOrderAction(formData: FormData) {
    "use server";
    const serviceId = String(formData.get("serviceId") ?? "");
    const nextValue = Number(formData.get("displayOrder") ?? NaN);
    if (!serviceId) return;
    await updateServiceDisplayOrder(serviceId, nextValue);
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/pages">
            <ArrowLeft className="h-4 w-4 mr-1" />
            固定ページ・表示設定へ
          </Link>
        </Button>
        <h1 className="text-xl font-bold">サービス表示順の管理</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        数値が小さいほど先に表示されます（例: 0 → 1 → 2）。トップページの「[PR]注目のサービス」とサービス一覧に反映されます。
      </p>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-12 gap-3 p-3 text-xs font-semibold text-muted-foreground border-b">
          <div className="col-span-6 md:col-span-7">サービス名</div>
          <div className="col-span-3 md:col-span-2">ステータス</div>
          <div className="col-span-3">表示順</div>
        </div>
        <ul className="divide-y">
          {services.map((service) => (
            <li key={service.id} className="p-3">
              <form action={updateOrderAction} className="grid grid-cols-12 gap-3 items-center">
                <input type="hidden" name="serviceId" value={service.id} />
                <div className="col-span-6 md:col-span-7 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{service.title}</p>
                  {service.provider_display_name && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      提供: {service.provider_display_name}
                    </p>
                  )}
                </div>
                <div className="col-span-3 md:col-span-2 text-xs text-muted-foreground">
                  {service.status}
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <Input
                    name="displayOrder"
                    type="number"
                    min={0}
                    max={9999}
                    defaultValue={service.display_order}
                    className="h-9"
                  />
                  <Button type="submit" size="sm" variant="outline">
                    保存
                  </Button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
