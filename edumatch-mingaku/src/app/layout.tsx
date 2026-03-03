import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { RequestListProvider } from "@/components/request-list/request-list-context";
import { FavoritesProvider } from "@/components/favorites/favorites-context";
import { MaintenanceAwareLayout } from "@/components/layout/maintenance-aware-layout";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://edu-match.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "エデュマッチ - 教育の未来を見つける、つながる",
    template: "%s | エデュマッチ",
  },
  description:
    "教育現場とEdTechをつなぐマッチングプラットフォーム。最新の教育事例やEdTechツールを探せます。",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
    siteName: "エデュマッチ",
    title: "エデュマッチ - 教育の未来を見つける、つながる",
    description:
      "教育現場とEdTechをつなぐマッチングプラットフォーム。最新の教育事例やEdTechツールを探せます。",
    images: [{ url: "/logo.png", width: 674, height: 176, alt: "エデュマッチロゴ" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "エデュマッチ - 教育の未来を見つける、つながる",
    description:
      "教育現場とEdTechをつなぐマッチングプラットフォーム。最新の教育事例やEdTechツールを探せます。",
    images: ["/logo.png"],
  },
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
        <MaintenanceAwareLayout>{children}</MaintenanceAwareLayout>
        <Toaster position="top-right" richColors closeButton />
        </FavoritesProvider>
        </RequestListProvider>
      </body>
    </html>
  );
}
