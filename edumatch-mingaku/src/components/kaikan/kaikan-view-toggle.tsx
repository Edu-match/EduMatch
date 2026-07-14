"use client";

import { useState } from "react";
import { CalendarDays, Map } from "lucide-react";
import { KaikanTimetable, type SelectableContent } from "./kaikan-timetable";
import dynamic from "next/dynamic";
import type { InteropSettings } from "@/lib/interop-settings";

const ForumMapMode = dynamic(
  () => import("@/components/interop/forum-map-mode").then((m) => m.ForumMapMode),
  { ssr: false, loading: () => <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">読み込み中…</div> },
);

type Props = {
  contents: SelectableContent[];
  appliedIds: string[];
  forumSettings?: InteropSettings;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forumActivity: { interop: any; forum: any };
};

type ViewMode = "timetable" | "hiroba";

export function KaikanViewToggle({ contents, appliedIds, forumSettings, forumActivity }: Props) {
  const [view, setView] = useState<ViewMode>("timetable");

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-xl border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setView("timetable")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            view === "timetable"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          タイムテーブル
        </button>
        <button
          type="button"
          onClick={() => setView("hiroba")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            view === "hiroba"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Map className="h-4 w-4" />
          教育のひろば
        </button>
      </div>

      {view === "timetable" ? (
        <KaikanTimetable contents={contents} appliedIds={appliedIds} />
      ) : (
        <div className="relative h-[65vh] overflow-hidden rounded-2xl border bg-[#e3f2fd]">
          <ForumMapMode
            themeMode={forumSettings?.themeMode ?? "auto"}
            guideText="中央のハブをタップ · 周囲の◎トピックでひろばへ"
            initialInteropActivity={forumActivity.interop}
            initialForumActivity={forumActivity.forum}
            showChat={false}
            initialScale={1.2}
            centerLabel={forumSettings?.centerLabel}
            centerHubItems={forumSettings?.centerHubItems}
            showLatestNews={forumSettings?.showLatestNews}
            showSpeakerQa={forumSettings?.showSpeakerQa}
            showOpinionBox={forumSettings?.showOpinionBox}
          />
        </div>
      )}
    </div>
  );
}
