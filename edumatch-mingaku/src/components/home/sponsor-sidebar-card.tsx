import { Megaphone } from "lucide-react";
import { getActiveSponsorAds } from "@/app/_actions/sponsor-ads";
import { SafeImage } from "@/components/ui/safe-image";

/**
 * トップページ右サイドバーのスポンサーPRカード。
 * [PR]注目のサービス と同じカードスタイルで HOME_SIDEBAR 広告を表示する。
 * 1件もなければ何も描画しない。
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
      <div className="p-4">
        <ul className="grid grid-cols-2 gap-3">
          {ads.map((ad) => (
            <li key={ad.id} className="min-w-0">
              <a
                href={`/api/sponsors/${ad.id}/click`}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                className="block group"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded border bg-muted">
                  <SafeImage
                    src={ad.image_url}
                    alt={ad.title}
                    fill
                    sizes="(max-width: 1024px) 50vw, 16vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <p className="mt-1 text-xs font-medium line-clamp-2 group-hover:text-[#1d4ed8] transition-colors">
                  {ad.title}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
