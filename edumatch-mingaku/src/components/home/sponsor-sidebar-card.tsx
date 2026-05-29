import { Megaphone } from "lucide-react";
import { getActiveSponsorAds } from "@/app/_actions/sponsor-ads";
import { SafeImage } from "@/components/ui/safe-image";

/**
 * トップページ右サイドバーのスポンサーPRカード。
 * HOME_SIDEBAR の公開中スポンサーを表示する。1件もなければ何も描画しない。
 */
export async function SponsorSidebarCard() {
  const ads = await getActiveSponsorAds("HOME_SIDEBAR", 4);
  if (ads.length === 0) return null;

  return (
    <div className="border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b flex items-center gap-3 shrink-0">
        <Megaphone className="h-6 w-6 text-primary shrink-0" />
        <h3 className="text-lg font-bold truncate">[PR]スポンサー</h3>
      </div>
      <div className="p-4 space-y-4">
        {ads.map((ad) => (
          <a
            key={ad.id}
            href={`/api/sponsors/${ad.id}/click`}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="group block"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
              <SafeImage
                src={ad.image_url}
                alt={ad.title}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <p className="mt-1.5 text-sm font-medium line-clamp-2 group-hover:text-[#1d4ed8] transition-colors">
              {ad.title}
            </p>
            {ad.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{ad.description}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
