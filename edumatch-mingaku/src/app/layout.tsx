import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SideMenu } from "@/components/layout/side-menu";
import { ChatbotWidget } from "@/components/layout/chatbot-widget";
import { Toaster } from "sonner";
import { RequestListProvider } from "@/components/request-list/request-list-context";
import { FavoritesProvider } from "@/components/favorites/favorites-context";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Edumatch - 教育の未来を見つける、つながる",
    template: "%s | Edumatch",
  },
  description:
    "教育現場とEdTechをつなぐマッチングプラットフォーム。最新の教育事例やEdTechツールを探せます。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <RequestListProvider>
        <FavoritesProvider>
        <div className="flex min-h-screen flex-col">
          <Header />
          <div className="flex-1 flex">
            {/* Desktop: left menu (not fixed) */}
            <aside className="hidden lg:block lg:w-64 lg:p-4 lg:pt-6 lg:flex-shrink-0">
              <div className="sticky top-20">
                <SideMenu />
              </div>
            </aside>

            <main className="flex-1">
              <div className="w-full">{children}</div>
            </main>
          </div>
          <Footer />
        </div>
        <ChatbotWidget />
        <Toaster position="top-right" richColors closeButton />
        </FavoritesProvider>
        </RequestListProvider>
      </body>
    </html>
  );
}
