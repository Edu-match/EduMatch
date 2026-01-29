import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { getServiceById } from "@/app/_actions";
import { getCurrentUserProfile } from "@/app/_actions";
import { RequestInfoForm } from "./RequestInfoForm";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ serviceId?: string }> };

export default async function RequestInfoPage({ searchParams }: Props) {
  await requireAuth();
  const { serviceId } = await searchParams;
  const profile = await getCurrentUserProfile();

  if (!serviceId) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold">資料請求</h1>
          <p className="text-muted-foreground">
            資料請求するサービスを選択してください。サービス詳細ページの「資料請求する」からお進みください。
          </p>
          <Button asChild>
            <Link href="/services">サービス一覧へ</Link>
          </Button>
        </div>
      </div>
    );
  }

  const service = await getServiceById(serviceId);
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
      serviceId={serviceId}
      service={service}
      profile={profile ? { name: profile.name, email: profile.email, phone: profile.phone ?? null, postal_code: profile.postal_code ?? null, prefecture: profile.prefecture ?? null, city: profile.city ?? null, address: profile.address ?? null } : null}
    />
  );
}
