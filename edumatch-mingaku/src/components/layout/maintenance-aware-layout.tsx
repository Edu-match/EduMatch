"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Header } from "@/components/layout/header";
import { SectionNav } from "@/components/layout/section-nav";
import { Footer } from "@/components/layout/footer";
import { ChatbotWidget } from "@/components/layout/chatbot-widget";
import { SwipeNavigation } from "@/components/layout/swipe-navigation";
import { AiPanelProvider, useAiPanel } from "@/components/layout/ai-panel-context";
import { useAiKenteiExamBlocksChat } from "@/hooks/use-ai-kentei-exam-blocks-chat";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

function AiPanelLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("header");
  const { open, setOpen, mobileOpen, setMobileOpen } = useAiPanel();
  const examBlocksChat = useAiKenteiExamBlocksChat();
  const [panelWidth, setPanelWidth] = useState(360);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    if (!resizing) return;

    function onPointerMove(e: PointerEvent) {
      const viewport = window.innerWidth;
      const next = viewport - e.clientX;
      const maxWidth = Math.min(760, Math.floor(viewport * 0.6));
      const clamped = Math.max(320, Math.min(maxWidth, next));
      setPanelWidth(clamped);
    }

    function onPointerUp() {
      setResizing(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [resizing]);

  return (
    <div className="flex min-h-screen flex-col w-full">
      <Header />

      {/* セクションナビ（ヘッダー直下・スティッキー）＋ヘッダー分スペーサー */}
      <SectionNav />

      {/* Desktop + tablet content row（左サイドバーは廃止し、ナビはヘッダー＋セクションナビに集約） */}
      <div className="flex-1 flex min-w-0">

        {/* Main content */}
        {/* 浮遊AIナビゲーターが最終行のCTAを覆わないよう、ボタン表示時のみ下部に余白を確保 */}
        <main
          className={cn(
            "flex-1 min-w-0 [overflow-x:clip] pb-24",
            !examBlocksChat && !open ? "lg:pb-28" : "lg:pb-0"
          )}
        >
          <div className="w-full">{children}</div>
        </main>

        {/* AI side panel – desktop (lg+) — AI検定受験中は非表示 */}
        {!examBlocksChat && open && (
          <div
            className="hidden lg:flex flex-col flex-shrink-0 transition-all duration-150 ease-in-out"
            style={{ width: `${panelWidth}px` }}
          >
            <div className="sticky top-[108px] z-20 h-[calc(100vh-108px)] flex flex-col">
              <div
                className="relative h-full flex flex-col border-l bg-background overflow-hidden"
                data-tutorial="ai-navigator-panel"
              >
                <div
                  className="absolute -left-1 top-0 h-full w-2 cursor-col-resize z-20 touch-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setResizing(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                    e.preventDefault();
                    // パネルは右側に固定されているため、← で広く / → で狭くなる
                    const delta = e.key === "ArrowLeft" ? 16 : -16;
                    const maxWidth = Math.min(760, Math.floor(window.innerWidth * 0.6));
                    setPanelWidth((w) => Math.max(320, Math.min(maxWidth, w + delta)));
                  }}
                  role="separator"
                  tabIndex={0}
                  aria-orientation="vertical"
                  aria-valuenow={panelWidth}
                  aria-valuemin={320}
                  aria-valuemax={760}
                  aria-label={t("resizeAiPanel")}
                />
                <ChatbotWidget />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AIナビゲーター起動ボタン – desktop（閉状態のみ・通常はアイコンのみ、ホバー/フォーカスでラベル展開）
          コンテンツのCTAを覆う面積を最小化するためコンパクトな円形を既定とする */}
      {!examBlocksChat && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group hidden lg:flex fixed bottom-6 right-6 z-40 items-center rounded-full border border-border/60 bg-white/85 p-2 text-sm font-semibold text-foreground shadow-lg shadow-black/5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-xl"
          aria-label={t("openAiPanel")}
          data-tutorial="ai-navigator-open"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </span>
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-48 group-hover:pl-2 group-hover:pr-2 group-hover:opacity-100 group-focus-visible:max-w-48 group-focus-visible:pl-2 group-focus-visible:pr-2 group-focus-visible:opacity-100">
            {t("aiNavigator")}
          </span>
        </button>
      )}

      <Footer />

      {/* Mobile FAB – AI検定受験中は非表示 */}
      {!examBlocksChat && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={cn(
            "lg:hidden fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 h-14 w-14 rounded-full bg-primary hover:opacity-90 shadow-xl hover:shadow-2xl transition-all flex items-center justify-center",
            mobileOpen && "hidden"
          )}
          aria-label={t("openAiNavigator")}
          data-tutorial="ai-navigator-open"
        >
          <Bot className="h-6 w-6 text-white" strokeWidth={2} />
        </button>
      )}

      {/* Mobile backdrop */}
      {!examBlocksChat && mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile bottom drawer */}
      {!examBlocksChat && (
        <div
          className={cn(
            "lg:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col transition-transform duration-300 ease-in-out",
            mobileOpen ? "translate-y-0" : "translate-y-full"
          )}
          style={{ height: "85dvh" }}
          aria-hidden={!mobileOpen}
          data-tutorial={mobileOpen ? "ai-navigator-panel" : undefined}
        >
          <div className="bg-background rounded-t-2xl shadow-2xl border-t flex flex-col h-full overflow-hidden pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-center px-4 pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>
            <ChatbotWidget isMobile />
          </div>
        </div>
      )}
    </div>
  );
}

export function MaintenanceAwareLayout({
  children,
  forceBare = false,
}: {
  children: React.ReactNode;
  /** サーバー側で host から判定した特設サブドメイン(special.*)フラグ。
   *  SSR時点で bare を確定させ、ヘッダー等の一瞬の表示（フラッシュ）を防ぐ。 */
  forceBare?: boolean;
}) {
  const pathname = usePathname();
  // メンテナンス画面と特設LP(/interop)は共通ヘッダー等を出さず全画面で表示する。
  // 特設サブドメイン(special.*)はmiddlewareで /interop にリライトされるが、
  // ブラウザURLは "/" のままで usePathname() が "/" を返すため、サーバーで host 判定した
  // forceBare とクライアントの window.location.hostname の両方で判定する。
  const isSpecialHost =
    forceBare ||
    (typeof window !== "undefined" && window.location.hostname.startsWith("special."));
  // 特設(インタロップ)から来たフォーラム等は、本サイトのヘッダー/チャットを出さない
  // （特設のAIチャットと二重表示・別chromeになるのを防ぐ）。
  const [fromInterop, setFromInterop] = useState(false);
  useEffect(() => {
    // URLクエリはReact外部の状態のため、マウント/遷移時の1回同期はやむを得ない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFromInterop(new URLSearchParams(window.location.search).get("from") === "interop");
  }, [pathname]);
  const isBareLayout =
    pathname === "/maintenance" ||
    !!pathname?.startsWith("/interop") ||
    // 教育のひろば 常設ルート（middleware で /interop に内部 rewrite される並行ルート）
    !!pathname?.startsWith("/idobata") ||
    isSpecialHost;
  // 注: 以前は「/forum を ?from=interop で開くと bare（chrome無し）」にしていたが、
  // 投稿ページで本サイトのヘッダー/ナビが消えて文脈を失うため廃止。
  // 特設キオスクの没入表示は special.* の host 判定(isSpecialHost)で別途維持される。
  void fromInterop;

  if (isBareLayout) {
    return (
      <div className="min-h-screen flex flex-col">
        <SwipeNavigation />
        {children}
      </div>
    );
  }

  return (
    <AiPanelProvider>
      <SwipeNavigation />
      <AiPanelLayout>{children}</AiPanelLayout>
    </AiPanelProvider>
  );
}
