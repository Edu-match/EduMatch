import Script from "next/script";

type GoogleAnalyticsProps = {
  measurementId: string;
};

/**
 * GA4 タグを初期 HTML に含める（beforeInteractive）。
 * クライアント専用の @next/third-parties だと gtag 初期化が HTML に載らず、
 * GA 管理画面の「データ収集が有効になっていません」判定に引っかかることがある。
 */
export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="beforeInteractive"
      />
      <Script
        id="gtag-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}');
          `,
        }}
      />
    </>
  );
}
