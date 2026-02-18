import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, User } from "lucide-react";
import { getPublicServicesFromSupabase } from "@/lib/supabase-services";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const services = await getPublicServicesFromSupabase();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">掲載企業一覧</h1>
        <p className="text-muted-foreground">
          Edumatchに掲載されているサービスとその投稿者（提供者）一覧です
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Card key={service.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="relative h-16 w-16 rounded-md overflow-hidden border bg-muted shrink-0">
                  {service.thumbnail_url ? (
                    <Image
                      src={service.thumbnail_url}
                      alt={service.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No Image
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1 line-clamp-2">{service.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {service.description}
                  </p>
                  {/* 投稿者（サービスの提供者） */}
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Link
                      href={`/profile/${service.provider.id}`}
                      className="flex items-center gap-2 hover:underline text-foreground"
                    >
                      {service.provider.avatar_url ? (
                        <Image
                          src={service.provider.avatar_url}
                          alt={service.provider.name}
                          width={24}
                          height={24}
                          className="rounded-full object-cover shrink-0"
                          unoptimized
                        />
                      ) : (
                        <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                          {service.provider.name.slice(0, 1)}
                        </span>
                      )}
                      <span className="truncate">{service.provider.name}</span>
                    </Link>
                  </div>
                  {service.category && (
                    <Badge variant="secondary" className="mt-2">
                      {service.category}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={`/services/${service.id}`}>サービス詳細</Link>
                </Button>
                <Button asChild size="sm" className="flex-1" variant="secondary">
                  <Link href={`/profile/${service.provider.id}`}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    提供者ページ
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>現在掲載中のサービスはありません。</p>
          <Button asChild className="mt-4">
            <Link href="/services">サービス一覧を見る</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
