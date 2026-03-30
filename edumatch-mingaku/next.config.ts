import type { NextConfig } from "next";

/** 接続先 Supabase プロジェクトに合わせて Storage の画像を許可（Vercel Preview の開発用 URL でもビルド時に解決される） */
function supabaseStorageHostname(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      return new URL(url).hostname;
    } catch {
      /* ignore */
    }
  }
  return "lyoesgwecpcoaylsyiys.supabase.co";
}

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // 旧サイト（WordPress等）のURLを新サイト構成にリダイレクト
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
        hostname: supabaseStorageHostname(),
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "edu-match.com",
        port: "",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
