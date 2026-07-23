import { getActiveSponsorAds } from "@/app/_actions/sponsor-ads";
import { SafeImage } from "@/components/ui/safe-image";

/**
 * トップページ右サイドバーのスポンサーPRバナー。
 * Yahoo! JAPAN 右カラム広告のようなフルサイズバナー形式で表示する。
 * 1件もなければ何も描画しない。
 */
export async function SponsorSidebarCard() {
  const ads = await getActiveSponsorAds("HOME_SIDEBAR", 2);
  if (ads.length === 0) return null;

  return (
    <div className="space-y-2">
      {ads.map((ad, index) => (
        <a
          key={ad.id}
          href={`/api/sponsors/${ad.id}/click`}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="group block overflow-hidden rounded-lg"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
            <SafeImage
              src={ad.image_url}
              alt={ad.title}
              fill
              priority={index === 0}
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
          <div className="flex items-start justify-between gap-2 pt-1">
            <p className="text-xs text-muted-foreground line-clamp-1 flex-1">
              {ad.title}
            </p>
            <span className="shrink-0 text-[10px] font-bold text-muted-foreground border border-muted-foreground/40 rounded px-1 py-px leading-none">
              広告
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
