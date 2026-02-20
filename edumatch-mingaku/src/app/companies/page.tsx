import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Building2 } from "lucide-react";
import { getAllServices } from "@/app/_actions";
import { sortServicesByDisplayOrder } from "@/lib/service-display-order";

export const dynamic = "force-dynamic";

/** サービスから「掲載企業（提供者）」を指定順でユニークに抽出 */
function getProvidersInDisplayOrder(
  services: Awaited<ReturnType<typeof getAllServices>>
): { providerId: string; providerName: string; avatarUrl: string | null; services: { id: string; title: string }[] }[] {
  const sorted = sortServicesByDisplayOrder(services);
  const seen = new Set<string>();
  const result: { providerId: string; providerName: string; avatarUrl: string | null; services: { id: string; title: string }[] }[] = [];

  for (const s of sorted) {
    const pid = s.provider?.id ?? s.provider_id;
    if (!pid || seen.has(pid)) continue;
    seen.add(pid);
    const name = s.provider_display_name ?? s.provider?.name ?? "提供者";
    const avatarUrl = s.provider?.avatar_url ?? null;
    const providerServices = services
      .filter((x) => (x.provider?.id ?? x.provider_id) === pid)
      .map((x) => ({ id: x.id, title: x.title }));
    result.push({ providerId: pid, providerName: name, avatarUrl, services: providerServices });
  }

  return result;
}

export default async function CompaniesPage() {
  const services = await getAllServices();
  const providers = getProvidersInDisplayOrder(services);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">掲載企業一覧</h1>
        <p className="text-muted-foreground">
          エデュマッチに掲載している企業（サービス提供者）一覧です
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((company) => (
          <Card key={company.providerId} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
                  {company.avatarUrl ? (
                    <Image
                      src={company.avatarUrl}
                      alt={company.providerName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-2 line-clamp-2">{company.providerName}</h3>
                  {company.services.length > 0 && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {company.services.map((sv) => (
                        <li key={sv.id}>
                          <Link href={`/services/${sv.id}`} className="hover:underline hover:text-foreground">
                            {sv.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <Button asChild className="w-full" size="sm">
                  <Link href={`/profile/${company.providerId}`}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    企業ページへ
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {providers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>現在掲載中の企業はありません。</p>
          <Button asChild className="mt-4">
            <Link href="/services">サービス一覧を見る</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
