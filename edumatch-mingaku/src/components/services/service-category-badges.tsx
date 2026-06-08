import { Badge } from "@/components/ui/badge";
import {
  formatServiceCategoryLabel,
  splitServiceCategoryTokens,
} from "@/lib/categories";
import { cn } from "@/lib/utils";

type ServiceCategoryBadgesProps = {
  category: string;
  className?: string;
  badgeClassName?: string;
  variant?: "default" | "outline" | "secondary" | "destructive";
  /** 一覧カードなど狭い領域向け: 先頭1件 + 残り件数 */
  compact?: boolean;
};

export function ServiceCategoryBadges({
  category,
  className,
  badgeClassName,
  variant = "default",
  compact = false,
}: ServiceCategoryBadgesProps) {
  const tokens = splitServiceCategoryTokens(category);
  if (tokens.length === 0) return null;

  const visibleTokens = compact ? tokens.slice(0, 1) : tokens;
  const hiddenCount = compact ? Math.max(0, tokens.length - 1) : 0;

  return (
    <div className={cn("flex flex-wrap gap-1.5 min-w-0 max-w-full", className)}>
      {visibleTokens.map((token) => (
        <Badge
          key={token}
          variant={variant}
          className={cn(
            "whitespace-normal shrink break-words text-left max-w-full h-auto",
            badgeClassName
          )}
        >
          {formatServiceCategoryLabel(token)}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Badge
          variant="secondary"
          className={cn("shrink-0", badgeClassName)}
        >
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
}
