"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Award,
  Bot,
  GraduationCap,
  Hand,
  Info,
  Landmark,
  Loader2,
  Network,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import { InteropTopBubbleMap } from "@/components/interop/interop-top-bubble-map";
import type { InteropCategory } from "@/components/interop/interop-category-bubble-map";
import {
  InteropSubOrbit,
  type InteropSubCategory,
} from "@/components/interop/interop-sub-orbit";
import type { InteropActivityStats } from "@/lib/interop-activity";
import type { InteropThemeMode } from "@/lib/interop-settings";

const ICONS: Record<string, LucideIcon> = {
  information: Info,
  "giin-kaikan": Landmark,
  "ai-kentei": Award,
  interop: Network,
  edumatch: GraduationCap,
  "ai-bu": Bot,
};

function iconFor(slug: string): LucideIcon {
  return ICONS[slug] ?? Sparkles;
}

const FX_CSS = `
  @keyframes itmBob {
    0%,100% { transform: translateY(0); }
    50% { transform: translateY(4px); }
  }
`;

type ActivityPayload = {
  subs: Array<{
    subCategoryId: string;
    categoryId: string;
    postCount: number;
    participantCount: number;
    lastPostedAt: string | null;
  }>;
  categories: Array<{
    categoryId: string;
    postCount: number;
    participantCount: number;
    lastPostedAt: string | null;
  }>;
};

const ACTIVITY_POLL_MS = 45_000;

export function InteropExplorer({
  themeMode = "auto",
  guideText = "中央のインタロップをタップして展示情報へ · 周囲のエリアから直接入ることもできます",
}: {
  themeMode?: InteropThemeMode;
  guideText?: string;
}) {
  const searchParams = useSearchParams();
  const catParam = searchParams.get("cat");

  const [categories, setCategories] = useState<InteropCategory[]>([]);
  const [subCategories, setSubCategories] = useState<InteropSubCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [selected, setSelected] = useState<InteropCategory | null>(null);
  const [activityBySub, setActivityBySub] = useState<Map<string, InteropActivityStats>>(new Map());
  const [activityByCategory, setActivityByCategory] = useState<Map<string, InteropActivityStats>>(new Map());

  const loadActivity = useCallback(() => {
    fetch("/api/interop/activity")
      .then((r) => r.json())
      .then((d: ActivityPayload) => {
        const subMap = new Map<string, InteropActivityStats>();
        for (const row of d.subs ?? []) {
          subMap.set(row.subCategoryId, {
            postCount: row.postCount,
            participantCount: row.participantCount,
            lastPostedAt: row.lastPostedAt,
          });
        }
        const catMap = new Map<string, InteropActivityStats>();
        for (const row of d.categories ?? []) {
          catMap.set(row.categoryId, {
            postCount: row.postCount,
            participantCount: row.participantCount,
            lastPostedAt: row.lastPostedAt,
          });
        }
        setActivityBySub(subMap);
        setActivityByCategory(catMap);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadActivity();
    const timer = window.setInterval(loadActivity, ACTIVITY_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadActivity]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/interop/categories")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !Array.isArray(d.categories)) return;
        setCategories(d.categories);
        if (catParam) {
          const match = d.categories.find((c: InteropCategory) => c.id === catParam);
          if (match) setSelected(match);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoadingCats(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) {
      setSubCategories([]);
      return;
    }
    let cancelled = false;
    setLoadingSubs(true);
    fetch(`/api/interop/sub-categories?categoryId=${selected.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d.subCategories)) setSubCategories(d.subCategories);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoadingSubs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const accent = selected?.color || "#9fb4e8";
  const showDarkBackdrop = !!selected;

  const handleSelectCategory = useCallback((cat: InteropCategory) => {
    setSelected(cat);
  }, []);

  const handleBackToMap = useCallback(() => {
    setSelected(null);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{FX_CSS}</style>

      {showDarkBackdrop && <InteropBackdrop themeMode={themeMode} />}

      {loadingCats ? (
        <div className="absolute inset-0 grid place-items-center text-white/60">
          <span className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" /> マップを起動中…
          </span>
        </div>
      ) : categories.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-white/60">
          まだカテゴリがありません。管理画面（/admin/interop）から追加してください。
        </div>
      ) : !selected ? (
        <>
          <InteropTopBubbleMap
            categories={categories}
            activityByCategory={activityByCategory}
            iconFor={iconFor}
            onSelectCategory={handleSelectCategory}
          />
          <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-4 sm:top-20">
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2 text-center text-[12px] font-medium text-white/90 sm:text-sm"
              style={{
                background: "rgba(8,11,32,0.45)",
                border: "1px solid rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Hand
                className="h-4 w-4 shrink-0 text-white/70"
                style={{ animation: "itmBob 1.6s ease-in-out infinite" }}
              />
              {guideText}
            </div>
          </div>
        </>
      ) : loadingSubs ? (
        <div className="absolute inset-0 grid place-items-center text-white/60">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <InteropSubOrbit
          selected={selected}
          subCategories={subCategories}
          activityBySub={activityBySub}
          accent={accent}
          iconFor={iconFor}
          onBackToMap={handleBackToMap}
        />
      )}
    </div>
  );
}
