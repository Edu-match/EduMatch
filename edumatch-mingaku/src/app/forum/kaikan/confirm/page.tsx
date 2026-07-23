import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ids = typeof sp.ids === "string" ? sp.ids : "";
  redirect(ids ? `/summit2026/confirm?ids=${encodeURIComponent(ids)}` : "/summit2026");
}
