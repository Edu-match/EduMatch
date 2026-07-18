import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist_Mono, Noto_Sans_JP } from "next/font/google";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { GoogleAnalyticsPageView } from "@/components/analytics/google-analytics-page-view";
import "./globals.css";
import { Toaster } from "sonner";
import { RequestListProvider } from "@/components/request-list/request-list-context";
import { FavoritesProvider } from "@/components/favorites/favorites-context";
import { MaintenanceAwareLayout } from "@/components/layout/maintenance-aware-layout";
import { TutorialProvider } from "@/components/tutorial/tutorial-provider";
import { TextEditProvider } from "@/components/text-edit/text-edit-context";
import { getAppVersionLabel } from "@/lib/app-version";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://edu-match.com";
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AIUEO BASE - 教育の未来を見つける、つながる",
    template: "%s | AIUEO BASE",
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
    siteName: "AIUEO BASE",
    title: "AIUEO BASE - 教育の未来を見つける、つながる",
    description:
      "教育現場とEdTechをつなぐマッチングプラットフォーム。最新の教育事例やEdTechツールを探せます。",
    images: [{ url: "/logo.png", width: 674, height: 176, alt: "AIUEO BASEロゴ" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIUEO BASE - 教育の未来を見つける、つながる",
    description:
      "教育現場とEdTechをつなぐマッチングプラットフォーム。最新の教育事例やEdTechツールを探せます。",
    images: ["/logo.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appVersion = getAppVersionLabel();
  const locale = await getLocale();
  // 特設サブドメイン(special.*)は SSR 時点で共通ヘッダー等を出さず全画面表示にする
  const host = (await headers()).get("host") ?? "";
  const isSpecialHost = host.startsWith("special.");

  return (
    <html lang={locale}>
      <head>
        {GA_MEASUREMENT_ID ? (
          <GoogleAnalytics measurementId={GA_MEASUREMENT_ID} />
        ) : null}
      </head>
      <body
        className={`${notoSansJP.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <NextIntlClientProvider>
        <RequestListProvider>
          <FavoritesProvider>
            <TutorialProvider>
              <TextEditProvider>
                <MaintenanceAwareLayout forceBare={isSpecialHost}>
                  {children}
                </MaintenanceAwareLayout>
              </TextEditProvider>
              {!isSpecialHost && (
                <div className="pointer-events-none fixed bottom-2 left-2 z-[100] rounded bg-background/80 px-2 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
                  {appVersion}
                </div>
              )}
              <Toaster position="top-right" richColors closeButton />
            </TutorialProvider>
          </FavoritesProvider>
        </RequestListProvider>
        </NextIntlClientProvider>
        {GA_MEASUREMENT_ID ? (
          <Suspense fallback={null}>
            <GoogleAnalyticsPageView measurementId={GA_MEASUREMENT_ID} />
          </Suspense>
        ) : null}
      </body>
    </html>
  );
}
