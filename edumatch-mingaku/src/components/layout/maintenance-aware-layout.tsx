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

    function onMouseMove(e: MouseEvent) {
      const viewport = window.innerWidth;
      const next = viewport - e.clientX;
      const maxWidth = Math.min(760, Math.floor(viewport * 0.6));
      const clamped = Math.max(320, Math.min(maxWidth, next));
      setPanelWidth(clamped);
    }

    function onMouseUp() {
      setResizing(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
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
        <main className="flex-1 min-w-0 [overflow-x:clip]">
          <div className="w-full">{children}</div>
        </main>

        {/* AI side panel – desktop (lg+) — AI検定受験中は非表示 */}
        {!examBlocksChat && open && (
          <div
            className="hidden lg:flex flex-col flex-shrink-0 transition-all duration-150 ease-in-out"
            style={{ width: `${panelWidth}px` }}
          >
            <div className="sticky top-16 z-40 h-[calc(100vh-4rem)] flex flex-col">
              <div
                className="relative h-full flex flex-col border-l bg-background overflow-hidden"
                data-tutorial="ai-navigator-panel"
              >
                <div
                  className="absolute -left-1 top-0 h-full w-2 cursor-col-resize z-20"
                  onMouseDown={() => setResizing(true)}
                  role="separator"
                  aria-label={t("resizeAiPanel")}
                />
                <ChatbotWidget />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AIナビゲーター起動ボタン – desktop（閉状態のみ・上品なフローティングピル） */}
      {!examBlocksChat && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hidden lg:flex fixed bottom-6 right-6 z-40 items-center gap-2.5 rounded-full border border-border/60 bg-white/85 px-5 py-3 text-sm font-semibold text-foreground shadow-lg shadow-black/5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-xl"
          aria-label={t("openAiPanel")}
          data-tutorial="ai-navigator-open"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </span>
          {t("aiNavigator")}
        </button>
      )}

      <Footer />

      {/* Mobile FAB – AI検定受験中は非表示 */}
      {!examBlocksChat && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={cn(
            "lg:hidden fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-primary hover:opacity-90 shadow-xl hover:shadow-2xl transition-all flex items-center justify-center",
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
          <div className="bg-background rounded-t-2xl shadow-2xl border-t flex flex-col h-full overflow-hidden">
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
