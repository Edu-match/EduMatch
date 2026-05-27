"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SideMenu } from "@/components/layout/side-menu";
import { ChatbotWidget } from "@/components/layout/chatbot-widget";
import { AiPanelProvider, useAiPanel } from "@/components/layout/ai-panel-context";
import { useAiKenteiExamBlocksChat } from "@/hooks/use-ai-kentei-exam-blocks-chat";
import { Bot, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

function AiPanelLayout({ children }: { children: React.ReactNode }) {
  const { open, setOpen, mobileOpen, setMobileOpen } = useAiPanel();
  const examBlocksChat = useAiKenteiExamBlocksChat();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panelWidth, setPanelWidth] = useState(520);
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

      {/* Desktop + tablet content row */}
      <div className="flex-1 flex min-w-0 pt-16">

        {/* Left sidebar（閉じたときは幅を詰めてメイン領域を広げる） */}
        <aside
          className={cn(
            "hidden lg:block flex-shrink-0 pt-1 transition-[width,padding] duration-200 ease-out",
            sidebarOpen ? "w-72 pr-4" : "w-12 pr-0"
          )}
        >
          <div className={cn("sticky top-[4.2rem]", sidebarOpen ? "px-3" : "px-1")}>
            {sidebarOpen ? (
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="mb-2 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="サイドメニューを閉じる"
              >
                <Menu className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="mb-2 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="サイドメニューを開く"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div
              data-tutorial="side-menu"
              className={cn(
                "overflow-hidden transition-all duration-200 ease-out",
                sidebarOpen
                  ? "max-w-[300px] opacity-100 translate-x-0"
                  : "max-w-0 opacity-0 -translate-x-3 pointer-events-none"
              )}
            >
              <SideMenu />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="w-full">{children}</div>
        </main>

        {/* AI side panel – desktop (lg+) — AI検定受験中は非表示 */}
        {!examBlocksChat && (
          <div
            className={cn(
              "hidden lg:flex flex-col flex-shrink-0 transition-all duration-150 ease-in-out",
              open ? "" : "lg:w-20"
            )}
            style={open ? { width: `${panelWidth}px` } : undefined}
          >
            <div className="sticky top-16 h-[calc(100vh-4rem)] flex flex-col">
              {open ? (
                <div
                  className="relative h-full flex flex-col border-l bg-background overflow-hidden"
                  data-tutorial="ai-navigator-panel"
                >
                  <div
                    className="absolute -left-1 top-0 h-full w-2 cursor-col-resize z-20"
                    onMouseDown={() => setResizing(true)}
                    role="separator"
                    aria-label="AIパネル幅を変更"
                  />
                  <ChatbotWidget />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="fixed right-0 top-16 bottom-0 z-30 w-20 flex flex-col items-center justify-center gap-4 border-l bg-orange-500 hover:bg-orange-400 text-white transition-all group"
                  aria-label="AIパネルを開く"
                  data-tutorial="ai-navigator-open"
                >
                  <Bot className="h-8 w-8 group-hover:scale-110 transition-transform" />
                  <span
                    className="text-sm font-bold select-none tracking-widest"
                    style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
                  >
                    AIナビゲーター
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />

      {/* Mobile FAB – AI検定受験中は非表示 */}
      {!examBlocksChat && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={cn(
            "lg:hidden fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-orange-500 hover:bg-orange-400 shadow-xl hover:shadow-2xl transition-all flex items-center justify-center",
            mobileOpen && "hidden"
          )}
          aria-label="AIナビゲーターを開く"
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
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMaintenance = pathname === "/maintenance";

  if (isMaintenance) {
    return <div className="min-h-screen flex flex-col">{children}</div>;
  }

  return (
    <AiPanelProvider>
      <AiPanelLayout>{children}</AiPanelLayout>
    </AiPanelProvider>
  );
}
