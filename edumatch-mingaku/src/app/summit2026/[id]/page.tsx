import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Users, Ticket, LogIn, ChevronLeft, ChevronDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { applyForKaikanContent, hasRedeemedInvite } from "@/app/_actions/kaikan";
import { InviteCodeGate } from "@/components/kaikan/invite-code-gate";
import { seatStatus } from "@/components/kaikan/seat-status";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

  const profile = await getCurrentProfile().catch(() => null);
  const invited = profile ? await hasRedeemedInvite(profile.id).catch(() => false) : false;
  const general = profile
    ? await prisma.generalProfile.findUnique({ where: { id: profile.id }, select: { legal_name: true, organization: true } }).catch(() => null)
    : null;
  const addr = profile
    ? await prisma.profile.findUnique({ where: { id: profile.id }, select: { postal_code: true, address: true } }).catch(() => null)
    : null;
  const loginHref = `/login?next=${encodeURIComponent(`/summit2026/${id}`)}`;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <Link href="/forum" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> 教育のひろばへ
      </Link>

      {/* イベントカード */}
      <section className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-primary to-chart-2 px-5 py-4 text-white">
          <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide opacity-90">
            <Ticket className="h-3.5 w-3.5" /> 教育AIサミット2026＠衆議院第一議員会館 · 電子チケット申込
          </p>
          <h1 className="mt-1 text-xl font-bold leading-snug">{content.title}</h1>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {content.starts_at && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{fmtDate(content.starts_at)}</span>}
            {content.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{content.location}</span>}
            {(() => {
              const ss = seatStatus(applied, content.capacity);
              return ss ? (
                <span className={`inline-flex items-center gap-1.5 font-bold ${ss.tone === "full" ? "text-muted-foreground" : "text-amber-600"}`}><Users className="h-4 w-4" />{ss.label}</span>
              ) : null;
            })()}
          </div>
          {content.speaker && <p className="text-sm font-medium text-foreground/90">登壇者：{content.speaker}</p>}
          {content.description && <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{content.description}</p>}
        </div>
      </section>

      {/* 申込 */}
      <section className="mt-5">
        {error === "full" && !full && (
          <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            申し込みが集中したため完了できませんでした。少し時間をおいて再度お試しください。
          </p>
        )}
        {error === "workshop" && (
          <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            ワークショップはお一人さま1つまでです。既にお申し込みのワークショップをキャンセルしてから再度お試しください。
          </p>
        )}
        {error === "overlap" && (
          <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            既にお申し込みのプログラムと時間帯が重なっているため、お申し込みできません。
          </p>
        )}
        {full ? (
          <div className="rounded-2xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            申し込みは定員に達しました。
          </div>
        ) : !profile ? (
          <div className="rounded-2xl border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">お申し込みにはログインが必要です。<br />アカウントの登録情報でそのまま申し込めます。</p>
            <Button asChild size="lg" className="mt-4">
              <Link href={loginHref}>
                <LogIn className="h-4 w-4" /> ログインして申し込む
              </Link>
            </Button>
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
              <Textarea name="note" rows={3} maxLength={500} className="resize-none" placeholder="登壇者に聞きたいこと、参加への期待など" />
            </div>
            <Button type="submit" size="lg" className="w-full">
              このアカウントで申し込む（電子チケットを発行）
            </Button>
            <p className="text-[11px] text-muted-foreground">申込後、受付で提示するQRコード付きの電子チケットが表示されます。</p>
          </form>
        )}
      </section>
    </main>
  );
}
