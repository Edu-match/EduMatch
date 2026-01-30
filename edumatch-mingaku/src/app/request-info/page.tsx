import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { getServiceById } from "@/app/_actions";
import { getCurrentUserProfile } from "@/app/_actions";
import { RequestInfoForm } from "./RequestInfoForm";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ serviceId?: string; serviceIds?: string }> };

export default async function RequestInfoPage({ searchParams }: Props) {
  await requireAuth();
  const { serviceId, serviceIds: serviceIdsParam } = await searchParams;
  const profile = await getCurrentUserProfile();
  const profileData = profile
    ? {
        name: profile.name,
        email: profile.email,
        phone: profile.phone ?? null,
        postal_code: profile.postal_code ?? null,
        prefecture: profile.prefecture ?? null,
        city: profile.city ?? null,
        address: profile.address ?? null,
      }
    : null;

  const serviceIds = serviceIdsParam
    ? serviceIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  if (!serviceId && !serviceIds?.length) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold">資料請求</h1>
          <p className="text-muted-foreground">
            資料請求するサービスを選択してください。サービス詳細ページの「資料請求する」からお進みください。リストに追加したサービスはまとめて請求できます。
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild>
              <Link href="/request-info/list">資料請求リストを見る</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/services">サービス一覧へ</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (serviceIds && serviceIds.length > 0) {
    const services = await Promise.all(
      serviceIds.map((id) => getServiceById(id))
    );
    const valid = services.filter(Boolean);
    if (valid.length === 0) {
      return (
        <div className="container py-8">
          <div className="max-w-md mx-auto text-center space-y-4">
            <h1 className="text-2xl font-bold">サービスが見つかりません</h1>
            <Button asChild>
              <Link href="/request-info/list">資料請求リストへ</Link>
            </Button>
          </div>
        </div>
      );
    }
    return (
      <RequestInfoForm
        serviceIds={serviceIds.filter((_, i) => services[i])}
        services={valid}
        profile={profileData}
      />
    );
  }

  const singleId = serviceId!;
  const service = await getServiceById(singleId);
  if (!service) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold">サービスが見つかりません</h1>
          <Button asChild>
            <Link href="/services">サービス一覧へ</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <RequestInfoForm
      serviceId={singleId}
      service={service}
      profile={profileData}
    />
  );
}
