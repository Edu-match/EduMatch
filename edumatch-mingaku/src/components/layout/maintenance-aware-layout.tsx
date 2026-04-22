"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SideMenu } from "@/components/layout/side-menu";
import { ChatbotWidget } from "@/components/layout/chatbot-widget";
import { AiPanelProvider, useAiPanel } from "@/components/layout/ai-panel-context";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

function AiPanelLayout({ children }: { children: React.ReactNode }) {
  const { open, setOpen, mobileOpen, setMobileOpen } = useAiPanel();

  return (
    <div className="flex min-h-screen flex-col w-full">
      <Header />

      {/* Desktop + tablet content row */}
      <div className="flex-1 flex min-w-0 pt-16">
        {/* Left sidebar – site navigation */}
        <aside className="hidden lg:block lg:w-64 lg:p-4 lg:pt-6 lg:flex-shrink-0">
          <div className="sticky top-20">
            <SideMenu />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="w-full">{children}</div>
        </main>

        {/* AI side panel – desktop (lg+) */}
        <div
          className={cn(
            "hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out",
            open ? "lg:w-[360px]" : "lg:w-10"
          )}
        >
          <div className="sticky top-16 h-[calc(100vh-4rem)] flex flex-col">
            {open ? (
              <div className="h-full flex flex-col border-l bg-background overflow-hidden">
                <ChatbotWidget />
              </div>
            ) : (
              /* Collapsed tab – click to reopen */
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="h-full w-10 flex flex-col items-center justify-center gap-2 border-l bg-muted/20 hover:bg-primary/5 hover:border-primary/30 transition-colors group"
                aria-label="AIパネルを開く"
              >
                <Bot className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span
                  className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors select-none"
                  style={{ writingMode: "vertical-rl" }}
                >
                  AIナビゲーター
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Mobile FAB – show when panel is closed */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className={cn(
          "lg:hidden fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-orange-500 hover:bg-orange-400 shadow-xl hover:shadow-2xl transition-all flex items-center justify-center",
          mobileOpen && "hidden"
        )}
        aria-label="AIナビゲーターを開く"
      >
        <Bot className="h-6 w-6 text-white" strokeWidth={2} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile bottom drawer */}
      <div
        className={cn(
          "lg:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ height: "85dvh" }}
        aria-hidden={!mobileOpen}
      >
        <div className="bg-background rounded-t-2xl shadow-2xl border-t flex flex-col h-full overflow-hidden">
          {/* Drag handle */}
          <div className="flex items-center justify-center px-4 pt-2 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          <ChatbotWidget isMobile />
        </div>
      </div>
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
