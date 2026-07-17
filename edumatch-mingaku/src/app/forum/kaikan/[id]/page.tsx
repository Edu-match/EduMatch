import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Users, Ticket, LogIn, ChevronLeft, ChevronDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { applyForKaikanContent, hasRedeemedInvite } from "@/app/_actions/kaikan";
import { InviteCodeGate } from "@/components/kaikan/invite-code-gate";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function KaikanApplyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  let content: Awaited<ReturnType<typeof prisma.kaikanContent.findUnique>> | null = null;
  try {
    content = await prisma.kaikanContent.findUnique({ where: { id } });
  } catch {
    content = null;
  }
  if (!content || !content.is_published) notFound();

  let applied = 0;
  try {
    applied = await prisma.kaikanApplication.count({ where: { content_id: id, status: { not: "cancelled" } } });
  } catch {
    applied = 0;
  }
  const full = content.capacity != null && applied >= content.capacity;
  const remaining = content.capacity != null ? Math.max(0, content.capacity - applied) : null;

  const profile = await getCurrentProfile().catch(() => null);
  const invited = profile ? await hasRedeemedInvite(profile.id).catch(() => false) : false;
  const general = profile
    ? await prisma.generalProfile.findUnique({ where: { id: profile.id }, select: { legal_name: true, organization: true } }).catch(() => null)
    : null;
  const addr = profile
    ? await prisma.profile.findUnique({ where: { id: profile.id }, select: { postal_code: true, address: true } }).catch(() => null)
    : null;
  const loginHref = `/login?next=${encodeURIComponent(`/forum/kaikan/${id}`)}`;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <Link href="/forum?map=3d" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> 教育のひろばへ
      </Link>

      {/* イベントカード */}
      <section className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-primary/90 to-violet-600 px-5 py-4 text-white">
          <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide opacity-90">
            <Ticket className="h-3.5 w-3.5" /> 議員会館イベント · 電子チケット申込
          </p>
          <h1 className="mt-1 text-xl font-bold leading-snug">{content.title}</h1>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {content.starts_at && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{fmtDate(content.starts_at)}</span>}
            {content.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{content.location}</span>}
            {content.capacity != null && (
              <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />定員 {content.capacity}名{remaining != null && <span className={remaining <= 5 ? "font-bold text-amber-600" : ""}>（残り{remaining}）</span>}</span>
            )}
          </div>
          {content.description && <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{content.description}</p>}
        </div>
      </section>

      {/* 申込 */}
      <section className="mt-5">
        {error === "full" && !full && (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            申込が集中したため完了できませんでした。少し時間をおいて再度お試しください。
          </p>
        )}
        {full ? (
          <div className="rounded-2xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            申込は定員に達しました。
          </div>
        ) : !profile ? (
          <div className="rounded-2xl border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">申込にはログインが必要です。<br />アカウントの登録情報でそのまま申し込めます。</p>
            <Link href={loginHref} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90">
              <LogIn className="h-4 w-4" /> ログインして申し込む
            </Link>
          </div>
        ) : !invited ? (
          <InviteCodeGate />
        ) : (
          <form action={applyForKaikanContent} className="space-y-4 rounded-2xl border bg-card p-5">
            <input type="hidden" name="contentId" value={content.id} />
            <p className="text-sm font-bold">この内容で申し込みます</p>
            {/* アカウント情報（登録済み・トグルで開閉） */}
            <details className="group rounded-xl border bg-muted/30">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-base font-bold text-primary">{profile.name?.charAt(0) || "?"}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{general?.legal_name || profile.name}</span>
                  <span className="block text-[11px] text-muted-foreground">タップして登録情報を確認</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <dl className="space-y-2 border-t px-4 py-3 text-sm">
                {([
                  ["表示名", profile.name],
                  ["メールアドレス", profile.email],
                  ...(profile.phone ? [["電話番号", profile.phone]] : []),
                  ...((() => { const a = [addr?.postal_code, addr?.address].filter(Boolean).join(" "); return a ? [["住所", a]] : []; })()),
                  ...(general?.organization ? [["所属", general.organization]] : []),
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">{k}</dt>
                    <dd className="min-w-0 text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">事前質問・期待すること <span className="text-muted-foreground">（任意）</span></label>
              <textarea name="note" rows={3} maxLength={500} className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="登壇者に聞きたいこと、参加への期待など" />
            </div>
            <button type="submit" className="w-full rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">
              このアカウントで申し込む（電子チケットを発行）
            </button>
            <p className="text-[11px] text-muted-foreground">申込後、受付で提示するQRコード付きの電子チケットが表示されます。</p>
          </form>
        )}
      </section>
    </main>
  );
}
