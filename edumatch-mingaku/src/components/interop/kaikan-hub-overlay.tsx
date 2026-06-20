"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Info, Trophy, MessagesSquare, ExternalLink, Landmark, Ticket } from "lucide-react";
import { InteropSubOrbit, type InteropOrbitItem } from "./interop-sub-orbit";
import { interopBoardPath } from "@/lib/interop-paths";
import { ensureExternalUrl, type CenterHubItem } from "@/lib/interop-settings";
import type { InteropActivityStats } from "@/lib/interop-activity";

const EMPTY_STATS: InteropActivityStats = { postCount: 0, participantCount: 0 };
const HUB_PALETTE = ["#fcd34d", "#86efac", "#c4b5fd", "#fca5a5", "#93c5fd"];

type Content = { id: string; title: string };

/** 中心ハブ（議員会館）クリックで開く “2D同等” のオービット表示。
 *  - ハブ層: コンテンツ / インフォメーション / AIチャンピオンシップ / ご意見 …（2Dの centerHubItems と同じ）
 *  - 「コンテンツ」→ 2枚目のオービットで各セッション → クリックで申込ページ /forum/kaikan/[id]
 *  ポップアップ（モーダル）ではなく InteropSubOrbit を Canvas 上に重ねる。 */
export function KaikanHubOrbit({ open, label, accent = "#9db8ff", onClose }: { open: boolean; label: string; accent?: string; onClose: () => void }) {
  const router = useRouter();
  const [level, setLevel] = useState<"hub" | "contents">("hub");
  const [hubItems, setHubItems] = useState<CenterHubItem[] | null>(null);
  const [contents, setContents] = useState<Content[] | null>(null);

  useEffect(() => { if (open) setLevel("hub"); }, [open]);

  useEffect(() => {
    if (!open || hubItems !== null) return;
    let cancelled = false;
    fetch("/api/interop/settings")
      .then((r) => r.json())
      .then((d: { settings?: { centerHubItems?: CenterHubItem[] } }) => { if (!cancelled) setHubItems(d.settings?.centerHubItems ?? []); })
      .catch(() => { if (!cancelled) setHubItems([]); });
    return () => { cancelled = true; };
  }, [open, hubItems]);

  useEffect(() => {
    if (!open || level !== "contents" || contents !== null) return;
    let cancelled = false;
    fetch("/api/kaikan/contents")
      .then((r) => r.json())
      .then((d: { contents?: Content[] }) => { if (!cancelled) setContents(d.contents ?? []); })
      .catch(() => { if (!cancelled) setContents([]); });
    return () => { cancelled = true; };
  }, [open, level, contents]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (level === "contents") setLevel("hub");
      else onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, level, onClose]);

  if (!open) return null;

  // ── ハブ層：先頭に「コンテンツ」、続いて2Dと同じハブ項目 ──
  const hubOrbit: InteropOrbitItem[] = [
    { id: "contents", name: "コンテンツ", icon: LayoutGrid, accentColor: "#7dd4fc", stats: EMPTY_STATS, onActivate: () => setLevel("contents") },
  ];
  if (hubItems && hubItems.length > 0) {
    hubItems.filter((it) => it.name?.trim()).forEach((it, i) => {
      hubOrbit.push({
        id: it.id,
        name: it.name,
        icon: it.kind === "board" ? MessagesSquare : ExternalLink,
        accentColor: HUB_PALETTE[i % HUB_PALETTE.length],
        stats: EMPTY_STATS,
        onActivate: () => {
          if (it.kind === "board" && it.subId) { onClose(); router.push(interopBoardPath(it.subId)); }
          else if (it.url) window.open(ensureExternalUrl(it.url), "_blank", "noopener,noreferrer");
        },
      });
    });
  } else {
    hubOrbit.push(
      { id: "info", name: "インフォメーション", icon: Info, accentColor: "#fcd34d", stats: EMPTY_STATS, onActivate: () => window.open("https://prtimes.jp/main/html/rd/p/000000046.000161501.html", "_blank", "noopener,noreferrer") },
      { id: "champ", name: "AIチャンピオンシップ", icon: Trophy, accentColor: "#c4b5fd", stats: EMPTY_STATS, onActivate: () => window.open("https://ai-ueo.org/2026/04/01/u18-ai-championship-2026/", "_blank", "noopener,noreferrer") },
      { id: "opinion", name: "ご意見・要望", icon: MessagesSquare, accentColor: "#86efac", stats: EMPTY_STATS, onActivate: () => { onClose(); router.push("/forum"); } },
    );
  }

  // ── コンテンツ層：各セッション → 申込ページ ──
  const contentOrbit: InteropOrbitItem[] = (contents ?? []).map((c) => ({
    id: c.id,
    name: c.title,
    icon: Ticket,
    accentColor: "#7dd4fc",
    stats: EMPTY_STATS,
    onActivate: () => { onClose(); router.push(`/forum/kaikan/${c.id}`); },
  }));

  const orbit =
    level === "contents" ? (
      <InteropSubOrbit
        centerLabel="コンテンツ"
        centerIcon={LayoutGrid}
        centerHint={contents === null ? "読み込み中…" : `${contentOrbit.length}件のセッション · 選んで申込`}
        accent="#7dd4fc"
        items={contentOrbit}
        backLabel="カテゴリへ戻る"
        onBack={() => setLevel("hub")}
      />
    ) : (
      <InteropSubOrbit
        centerLabel={label}
        centerIcon={Landmark}
        centerHint="コンテンツ · インフォメーション · ご意見"
        accent={accent}
        items={hubOrbit}
        backLabel="ビューに戻る"
        onBack={onClose}
      />
    );

  return (
    <div className="absolute inset-0 z-50">
      {/* 背景の3Dノードが透けないよう暗幕。クリックで閉じる/戻る。 */}
      <button
        type="button"
        aria-label="閉じる"
        onClick={() => (level === "contents" ? setLevel("hub") : onClose())}
        className="absolute inset-0 bg-[#04060f]/78 backdrop-blur-[3px]"
      />
      <div className="absolute inset-0">{orbit}</div>
    </div>
  );
}
