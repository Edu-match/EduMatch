import { getActiveSponsorAds } from "@/app/_actions/sponsor-ads";
import { SafeImage } from "@/components/ui/safe-image";

/**
 * トップページ メインカラムのスポンサーPRバナー。
 * HOME_MAIN の公開中スポンサーを表示する。1件もなければ何も描画しない。
 */
export async function SponsorPRSection() {
  const ads = await getActiveSponsorAds("HOME_MAIN", 3);
  if (ads.length === 0) return null;

  return (
    <section aria-label="スポンサーPR" className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          PR
        </span>
        <span className="text-xs text-muted-foreground">スポンサー</span>
      </div>
      <div className="space-y-3">
        {ads.map((ad) => (
          <a
            key={ad.id}
            href={`/api/sponsors/${ad.id}/click`}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="group block overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-[16/5] w-full overflow-hidden bg-muted">
              <SafeImage
                src={ad.image_url}
                alt={ad.title}
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            {(ad.title || ad.description) && (
              <div className="p-3">
                <p className="text-sm font-bold line-clamp-1 group-hover:text-[#1d4ed8] transition-colors">
                  {ad.title}
                </p>
                {ad.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {ad.description}
                  </p>
                )}
              </div>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
