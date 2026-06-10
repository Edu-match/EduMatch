"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GraduationCap,
  Hand,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { ForumBackdrop } from "@/components/forum-map/forum-backdrop";
import { ForumSubOrbit, type ForumOrbitItem } from "@/components/forum-map/forum-sub-orbit";
import type { ForumCategory } from "@/components/community/forum-category-explorer";
import type { ForumActivityStats } from "@/lib/forum-hot";

const EMPTY_STATS: ForumActivityStats = { postCount: 0, participantCount: 0 };
const DEFAULT_ACCENT = "#9fb4e8";

const FX_CSS = `
  @keyframes fmBob {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(4px); }
  }
  @keyframes fmFadeIn {
    from { opacity: 0; transform: scale(0.97); }
    to   { opacity: 1; transform: scale(1); }
  }
`;

type RoomSummary = {
  id: string;
  name: string;
  postCount: number;
  participantCount: number;
};

type View =
  | { kind: "top" }
  | { kind: "category"; cat: ForumCategory };

function roomBelongsToCategory(roomId: string, categorySlug: string): boolean {
  return (
    roomId.startsWith(`cat-${categorySlug}--`) ||
    roomId.startsWith(`room-${categorySlug}--`)
  );
}

export function ForumBubbleExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catParam = searchParams.get("cat");

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [allRooms, setAllRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ kind: "top" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/forum/categories").then((r) => r.json()),
      fetch("/api/forum/rooms", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([cat, rooms]) => {
        if (cancelled) return;
        const cats: ForumCategory[] = Array.isArray(cat.categories)
          ? cat.categories.map((c: ForumCategory) => ({ ...c, tags: Array.isArray(c.tags) ? c.tags : [] }))
          : [];
        setCategories(cats);

        const roomList: RoomSummary[] = Array.isArray(rooms.rooms)
          ? rooms.rooms.map((r: { id: string; name: string; postCount?: number; participantCount?: number }) => ({
              id: r.id,
              name: r.name,
              postCount: r.postCount ?? 0,
              participantCount: r.participantCount ?? 0,
            }))
          : [];
        setAllRooms(roomList);

        if (catParam) {
          const match = cats.find((c) => c.slug === catParam);
          if (match) setView({ kind: "category", cat: match });
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryStats = useMemo((): Map<string, ForumActivityStats> => {
    const map = new Map<string, ForumActivityStats>();
    for (const cat of categories) {
      const related = allRooms.filter((r) => roomBelongsToCategory(r.id, cat.slug));
      map.set(cat.id, {
        postCount: related.reduce((s, r) => s + r.postCount, 0),
        participantCount: related.reduce((s, r) => s + r.participantCount, 0),
      });
    }
    return map;
  }, [categories, allRooms]);

  const categoryItems = useMemo((): ForumOrbitItem[] => {
    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      icon: MessageCircle,
      stats: categoryStats.get(cat.id) ?? EMPTY_STATS,
      onActivate: () => {
        setView({ kind: "category", cat });
        router.push(`/forum?cat=${encodeURIComponent(cat.slug)}`, { scroll: false });
      },
    }));
  }, [categories, categoryStats, router]);

  const roomItems = useMemo((): ForumOrbitItem[] => {
    if (view.kind !== "category") return [];
    return allRooms
      .filter((r) => roomBelongsToCategory(r.id, view.cat.slug))
      .map((r) => ({
        id: r.id,
        name: r.name,
        icon: MessageCircle,
        stats: { postCount: r.postCount, participantCount: r.participantCount },
        onActivate: () => router.push(`/forum/${r.id}`),
      }));
  }, [view, allRooms, router]);

  const handleBack = useCallback(() => {
    setView({ kind: "top" });
    router.push("/forum", { scroll: false });
  }, [router]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <ForumBackdrop />
        <Loader2 className="relative z-10 h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  const accent = view.kind === "category" ? (view.cat.color || DEFAULT_ACCENT) : DEFAULT_ACCENT;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ animation: "fmFadeIn 0.4s ease-out both" }}>
      <style>{FX_CSS}</style>
      <ForumBackdrop />

      {view.kind === "top" ? (
        <>
          <ForumSubOrbit
            centerLabel="井戸端会議"
            centerIcon={GraduationCap}
            centerHint={`${categories.length}つのカテゴリ · タップして話題を探す`}
            accent={DEFAULT_ACCENT}
            items={categoryItems}
            backLabel=""
            onBack={() => {}}
            hideBack
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
                style={{ animation: "fmBob 1.6s ease-in-out infinite" }}
              />
              カテゴリをタップして話題の部屋へ
            </div>
          </div>
        </>
      ) : (
        <ForumSubOrbit
          centerLabel={view.cat.name}
          centerIcon={MessageCircle}
          centerHint={`${roomItems.length}つの部屋 · タップして入る`}
          accent={accent}
          items={roomItems}
          backLabel="カテゴリ一覧に戻る"
          onBack={handleBack}
        />
      )}
    </div>
  );
}
