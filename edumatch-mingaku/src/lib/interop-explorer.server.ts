import { headers } from "next/headers";

/**
 * 教育のひろばマップ（InteropExplorer）の初回SSR用に活動量を先読みする。
 * /interop・/forum・トップページ埋め込みで共用。失敗しても null を返して描画を止めない。
 */
// 返り値は InteropExplorer の initial*Activity props にそのまま渡す。
// API レスポンス(JSON)の形に依存するため緩く any で受ける。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchInteropInitialActivity(): Promise<{ interop: any; forum: any }> {
  try {
    const h = await headers();
    const host = h.get("host");
    if (!host) return { interop: null, forum: null };
    const proto =
      h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;
    const [interop, forum] = await Promise.all([
      fetch(`${origin}/api/interop/activity`, { next: { revalidate: 30 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${origin}/api/forum/rooms?communityThemes=true`, { next: { revalidate: 60 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);
    return { interop, forum };
  } catch {
    return { interop: null, forum: null };
  }
}
