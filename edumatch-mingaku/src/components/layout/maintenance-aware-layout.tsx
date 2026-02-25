"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SideMenu } from "@/components/layout/side-menu";
import { ChatbotWidget } from "@/components/layout/chatbot-widget";

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
    <>
      <div className="flex min-h-screen flex-col w-full">
        <Header />
        <div className="flex-1 flex min-w-0 pt-16">
          <aside className="hidden lg:block lg:w-64 lg:p-4 lg:pt-6 lg:flex-shrink-0">
            <div className="sticky top-20">
              <SideMenu />
            </div>
          </aside>
          <main className="flex-1 min-w-0 overflow-x-hidden">
            <div className="w-full">{children}</div>
          </main>
        </div>
        <Footer />
      </div>
      <ChatbotWidget />
    </>
  );
}
