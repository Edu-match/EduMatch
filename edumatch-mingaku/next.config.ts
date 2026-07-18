import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** 接続先 Supabase プロジェクトに合わせて Storage の画像を許可 */
function supabaseStorageHostname(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      return new URL(url).hostname;
    } catch {
      /* ignore */
    }
  }
  return "vemazlfbgtrphoizmyac.supabase.co";
}

const SUPABASE_HOSTNAME = supabaseStorageHostname();
const SUPABASE_PROJECT_ID = SUPABASE_HOSTNAME.split(".")[0];

/**
 * Content-Security-Policy（enforce モード）
 * 違反するリソースはブロックされる。新規外部リソースを追加する際は要更新。
 */
function buildCsp(): string {
  const supabaseOrigin = `https://${SUPABASE_HOSTNAME}`;
  const supabaseApiOrigin = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
  const supabaseWs = `wss://${SUPABASE_PROJECT_ID}.supabase.co`;
  const isDev = process.env.NODE_ENV === "development";

  const directives: Record<string, string> = {
    "default-src": "'self'",
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://www.googletagmanager.com",
    ].join(" "),
    "style-src": "'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src": "'self' https://fonts.gstatic.com",
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      supabaseOrigin,
      "https://*.supabase.co",
      "https://placehold.co",
      "https://drive.google.com",
      "https://lh3.googleusercontent.com",
      "https://raw.githubusercontent.com",
      "https://edu-match.com",
      "https://www.google-analytics.com",
      "https://www.googletagmanager.com",
    ].join(" "),
    "connect-src": [
      "'self'",
      supabaseApiOrigin,
      supabaseOrigin,
      supabaseWs,
      "https://api.openai.com",
      "https://accounts.google.com",
      "https://www.google-analytics.com",
      "https://*.google-analytics.com",
      "https://www.googletagmanager.com",
    ].join(" "),
    "frame-src": "'self' https://drive.google.com https://www.youtube.com",
    "frame-ancestors": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "object-src": "'none'",
  };

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v}`)
    .join("; ");
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "isomorphic-dompurify", "jsdom"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Download-Options", value: "noopen" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          {
            // enforce モード: ポリシー違反のリソースをブロックする
            key: "Content-Security-Policy",
            value: buildCsp(),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/about/", destination: "/about", permanent: true },
      { source: "/contact/", destination: "/contact", permanent: true },
      { source: "/terms/", destination: "/terms", permanent: true },
      { source: "/privacy/", destination: "/privacy", permanent: true },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: SUPABASE_HOSTNAME,
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "edu-match.com",
        port: "",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        port: "",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        port: "",
        pathname: "/vi/**",
      },
    ],
    // placehold.co のフォールバック画像は SVG のため、最適化経由で配信できるよう許可する。
    // sandbox CSP + attachment でスクリプト実行リスクを遮断（Next.js 公式推奨の安全設定）
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withNextIntl(nextConfig);
