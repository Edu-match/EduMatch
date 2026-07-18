"use server";

import { randomUUID, randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, requireAdmin, requireAdminOrKaikanStaff } from "@/lib/auth";

/**
 * datetime-local（YYYY-MM-DDTHH:MM）やCSVの日時文字列を JST として解釈する。
 * タイムゾーン付き（+09:00 / Z）の入力はそのまま解釈。Vercel(UTC)でも入力が9時間ズレない。
 */
function parseJstDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  const withSec = /T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
  const d = new Date(`${withSec}+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// 招待コード用の文字集合（紛らわしい O/0/I/1/L を除外）。
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateInviteCode(len = 8): string {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  return s;
}

/** 入力コードを正規化（英数のみ・大文字）。表示はハイフン入りでも入力は自由。 */
function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** 2つの時間帯が重なるか（両方に開始・終了がある場合のみ判定）。 */
function timeOverlaps(
  aStart: Date | null, aEnd: Date | null,
  bStart: Date | null, bEnd: Date | null,
): boolean {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/** 指定アカウントが招待コードを使用済み（＝申込資格あり）か。 */
export async function hasRedeemedInvite(profileId: string): Promise<boolean> {
  const r = await prisma.kaikanInviteRedemption.findFirst({ where: { profile_id: profileId }, select: { id: true } });
  return !!r;
}

/** 招待コードを入力して申込資格を有効化する（共通コード対応）。 */
export async function redeemInviteCode(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const code = normalizeCode(String(formData.get("code") || ""));
  if (!code) return { ok: false, error: "招待コードを入力してください" };

  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "ログインが必要です" };

  if (await hasRedeemedInvite(profile.id)) {
    revalidatePath("/forum/kaikan");
    return { ok: true };
  }

  const invite = await prisma.kaikanInviteCode.findUnique({ where: { code } });
  if (!invite) return { ok: false, error: "招待コードが正しくありません。メールに記載のコードをご確認ください。" };
  if (!invite.is_active) return { ok: false, error: "この招待コードは無効化されています。" };

  await prisma.kaikanInviteRedemption.upsert({
    where: { code_id_profile_id: { code_id: invite.id, profile_id: profile.id } },
    create: { code_id: invite.id, profile_id: profile.id },
    update: {},
  });
  revalidatePath("/forum/kaikan");
  return { ok: true };
}

/** 管理者：招待コードを一括生成する。 */
export async function generateKaikanInviteCodes(formData: FormData): Promise<void> {
  await requireAdmin();
  const countRaw = parseInt(String(formData.get("count") || ""), 10);
  const count = Math.max(1, Math.min(500, Number.isNaN(countRaw) ? 10 : countRaw));
  const note = String(formData.get("note") || "").trim();

  const codes = new Set<string>();
  while (codes.size < count) codes.add(generateInviteCode());
  await prisma.kaikanInviteCode.createMany({
    data: [...codes].map((code) => ({ code, note })),
    skipDuplicates: true,
  });
  revalidatePath("/admin/kaikan");
}

/** 管理者：招待コードの有効/無効を切り替える。 */
export async function toggleKaikanInviteCode(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const nextActive = String(formData.get("next") || "") === "true";
  if (!id) return;
  await prisma.kaikanInviteCode.update({ where: { id }, data: { is_active: nextActive } });
  revalidatePath("/admin/kaikan");
}

/** 管理者：招待コードを削除する。 */
export async function deleteKaikanInviteCode(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.kaikanInviteCode.delete({ where: { id } });
  revalidatePath("/admin/kaikan");
}

/**
 * 定員チェック＋申込作成をアトミックに行う。満員なら false を返す。
 * Serializable 分離レベルで同時申込のオーバーブッキングを防ぐ（競合時は失敗扱い）。
 */
async function createApplicationIfCapacity(args: {
  contentId: string;
  capacity: number | null;
  profileId: string;
  name: string;
  email: string;
  note: string;
  qrToken: string;
  ticketToken: string;
}): Promise<boolean> {
  try {
    await prisma.$transaction(
      async (tx) => {
        if (args.capacity != null) {
          const count = await tx.kaikanApplication.count({
            where: { content_id: args.contentId, status: { not: "cancelled" } },
          });
          if (count >= args.capacity) throw new Error("KAIKAN_FULL");
        }
        await tx.kaikanApplication.create({
          data: {
            content_id: args.contentId,
            name: args.name,
            email: args.email,
            note: args.note,
            qr_token: args.qrToken,
            ticket_token: args.ticketToken,
            profile_id: args.profileId,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return true;
  } catch {
    // 満員・直列化競合・ユニーク違反はすべて「申込不成立」として扱う
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] ?? c));
}

/**
 * 申込完了メール：チケット風デザイン（QR画像をインライン埋め込み）＋お問い合わせボタン。
 * ページを閉じてもチケットに再到達できるようにする。
 */
async function sendTicketEmail(
  email: string,
  name: string,
  ticketToken: string,
  sessions: { title: string; starts_at: Date | null; location: string }[],
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[kaikan/ticket-email] RESEND_API_KEY 未設定のため確認メールをスキップしました:", email);
    return;
  }
  if (!email) return;
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://edu-match.com").replace(/\/$/, "");
  const ticketUrl = `${base}/forum/kaikan/ticket/${ticketToken}`;
  const contactUrl = `${base}/contact`;
  // チケット画面のQRと同一のチェックインURLをエンコード
  const checkinUrl = `${base}/admin/kaikan?tab=checkin&token=${ticketToken}`;
  const receipt = `${ticketToken.slice(0, 4).toUpperCase()}-${ticketToken.slice(4, 8).toUpperCase()}`;

  try {
    const QRCode = (await import("qrcode")).default;
    const qrPng = await QRCode.toBuffer(checkinUrl, { width: 360, margin: 2 });

    const fmtJst = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
    const sessionRows = sessions
      .map((s) => {
        const when = s.starts_at ? fmtJst.format(s.starts_at) : "";
        const meta = [when, s.location].filter(Boolean).join(" ・ ");
        return `<tr><td style="padding:10px 14px;border-top:1px solid #eee;">
          <div style="font-weight:bold;font-size:14px;color:#1f2937;">${escapeHtml(s.title)}</div>
          ${meta ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${escapeHtml(meta)}</div>` : ""}
        </td></tr>`;
      })
      .join("");

    const resend = new Resend(key);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "【エデュマッチ】電子チケットのご案内（教育AIサミット2026＠衆議院第一議員会館）",
      attachments: [{ filename: "ticket-qr.png", content: qrPng, contentId: "ticket-qr" }],
      html: `
<div style="max-width:480px;margin:0 auto;font-family:'Hiragino Sans','Noto Sans JP',sans-serif;">
  <p style="font-size:14px;color:#374151;">${escapeHtml(name)} 様</p>
  <p style="font-size:14px;color:#374151;">教育AIサミット2026＠衆議院第一議員会館へのお申し込みありがとうございます。<br>当日は受付でこちらの電子チケットをご提示ください。</p>

  <div style="border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;margin:20px 0;">
    <div style="background:linear-gradient(135deg,#6d28d9,#7c3aed);padding:16px 20px;">
      <div style="color:#ede9fe;font-size:11px;font-weight:bold;letter-spacing:1px;">電子チケット</div>
      <div style="color:#ffffff;font-size:17px;font-weight:bold;margin-top:4px;">教育AIサミット2026＠衆議院第一議員会館</div>
    </div>
    <div style="padding:20px;text-align:center;background:#ffffff;">
      <img src="cid:ticket-qr" alt="チケットQRコード" width="200" height="200" style="display:block;margin:0 auto;border:1px solid #eee;border-radius:12px;" />
      <div style="margin-top:14px;background:#f5f3ff;border-radius:10px;padding:10px;">
        <div style="font-size:11px;color:#6b7280;">受付番号</div>
        <div style="font-family:monospace;font-size:22px;font-weight:900;letter-spacing:3px;color:#111827;">${receipt}</div>
      </div>
      <div style="margin-top:10px;font-size:13px;color:#374151;">お名前：<strong>${escapeHtml(name)}</strong></div>
    </div>
    ${sessionRows ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;"><tr><td style="padding:10px 14px 0;font-size:11px;font-weight:bold;color:#6b7280;">参加プログラム（${sessions.length}件）</td></tr>${sessionRows}</table>` : ""}
  </div>

  <div style="text-align:center;margin:24px 0;">
    <a href="${ticketUrl}" style="display:inline-block;background:#6d28d9;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:9999px;">チケットを表示する</a>
  </div>
  <div style="text-align:center;margin:12px 0 24px;">
    <a href="${contactUrl}" style="display:inline-block;border:1px solid #d1d5db;color:#374151;font-size:13px;font-weight:bold;text-decoration:none;padding:10px 24px;border-radius:9999px;">お問い合わせはこちら</a>
  </div>

  <p style="font-size:11px;color:#9ca3af;">※QRコードが表示されない場合は「チケットを表示する」ボタンからもご提示いただけます。<br>※このメールに心当たりがない場合は破棄してください。</p>
  <p style="font-size:12px;color:#6b7280;">— エデュマッチ運営</p>
</div>
      `.trim(),
    });
  } catch (e) {
    console.error("[kaikan/ticket-email]", e);
  }
}

/** ログイン中アカウントでコンテンツに申込→電子チケット(QR)を発行。氏名/メールはアカウント情報を使用。 */
export async function applyForKaikanContent(formData: FormData) {
  const contentId = String(formData.get("contentId") || "").trim();
  const note = String(formData.get("note") || "").trim();
  if (!contentId) redirect("/forum/kaikan");

  // 申込にはログイン必須。氏名・メールはアカウント登録情報を使う。
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/forum/kaikan/${contentId}`)}`);

  // 招待コード入力済みが申込の前提（共通コード方式）
  if (!(await hasRedeemedInvite(profile.id))) redirect("/forum/kaikan?error=invite");

  const content = await prisma.kaikanContent.findUnique({ where: { id: contentId } });
  if (!content || !content.is_published) redirect(`/forum/kaikan?error=closed`);

  // 同一アカウントの二重申込を防ぐ：既存があればそのチケットへ。
  const existing = await prisma.kaikanApplication.findFirst({
    where: { content_id: contentId, profile_id: profile.id, status: { not: "cancelled" } },
    select: { qr_token: true, ticket_token: true },
  });
  if (existing) redirect(`/forum/kaikan/ticket/${existing.ticket_token ?? existing.qr_token}`);

  // 既存チケットがあれば合流する（別トークンでチケットが分裂しないように）。
  // qr_token は @unique のため共有不可 → セッション用に別途発行する。
  const existingTicket = await prisma.kaikanApplication.findFirst({
    where: { profile_id: profile.id, status: { not: "cancelled" }, ticket_token: { not: null } },
    select: { ticket_token: true },
  });
  const ticketToken = existingTicket?.ticket_token ?? randomUUID().replace(/-/g, "");
  const qrToken = randomUUID().replace(/-/g, "");
  const ok = await createApplicationIfCapacity({
    contentId,
    capacity: content.capacity,
    profileId: profile.id,
    name: profile.name,
    email: profile.email ?? "",
    note,
    qrToken,
    ticketToken,
  });
  if (!ok) redirect(`/forum/kaikan/${contentId}?error=full`);

  // チケットに載る全プログラム（既存分含む）をメールに記載
  const myApps = await prisma.kaikanApplication.findMany({
    where: { ticket_token: ticketToken, profile_id: profile.id, status: { not: "cancelled" } },
    select: { content: { select: { title: true, starts_at: true, location: true } } },
    orderBy: { created_at: "asc" },
  }).catch(() => []);
  await sendTicketEmail(
    profile.email ?? "",
    profile.name,
    ticketToken,
    myApps.map((a) => a.content).filter(Boolean),
  );
  revalidatePath("/admin/kaikan");
  redirect(`/forum/kaikan/ticket/${ticketToken}`);
}

/** 複数コンテンツをまとめて申込→1枚のチケット(共有ticket_token)に集約。受付はセッション単位。 */
export async function applyForKaikanContents(formData: FormData) {
  const contentIds = formData.getAll("contentId").map(String).map((s) => s.trim()).filter(Boolean);
  const note = String(formData.get("note") || "").trim();
  if (contentIds.length === 0) redirect("/forum/kaikan");

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/forum/kaikan/confirm?ids=${contentIds.join(",")}`)}`);

  // 招待コード入力済みが申込の前提（共通コード方式）
  if (!(await hasRedeemedInvite(profile.id))) redirect("/forum/kaikan?error=invite");

  // 既存の自分の申込（このアカウント）を見て、チケットを流用しつつ二重を避ける
  const existingApps = await prisma.kaikanApplication.findMany({
    where: { profile_id: profile.id, status: { not: "cancelled" } },
    select: { content_id: true, ticket_token: true },
  });
  const alreadyIds = new Set(existingApps.map((a) => a.content_id));
  const ticketToken = existingApps.find((a) => a.ticket_token)?.ticket_token ?? randomUUID().replace(/-/g, "");

  const toAdd = contentIds.filter((id) => !alreadyIds.has(id));
  const contents = await prisma.kaikanContent.findMany({ where: { id: { in: toAdd }, is_published: true } });

  let addedCount = 0;
  const skippedTitles: string[] = [];
  for (const c of contents) {
    const ok = await createApplicationIfCapacity({
      contentId: c.id,
      capacity: c.capacity,
      profileId: profile.id,
      name: profile.name,
      email: profile.email ?? "",
      note,
      qrToken: randomUUID().replace(/-/g, ""),
      ticketToken,
    });
    if (ok) addedCount++;
    else skippedTitles.push(c.title);
  }
  // 非公開化などで取得できなかった選択分も件数として通知
  const unavailable = toAdd.length - contents.length;
  if (unavailable > 0) skippedTitles.push(`受付終了 ${unavailable}件`);

  if (addedCount > 0) {
    // チケットに載る全プログラム（既存分含む）をメールに記載
    const myApps = await prisma.kaikanApplication.findMany({
      where: { ticket_token: ticketToken, profile_id: profile.id, status: { not: "cancelled" } },
      select: { content: { select: { title: true, starts_at: true, location: true } } },
      orderBy: { created_at: "asc" },
    }).catch(() => []);
    await sendTicketEmail(
      profile.email ?? "",
      profile.name,
      ticketToken,
      myApps.map((a) => a.content).filter(Boolean),
    );
  }
  revalidatePath("/admin/kaikan");

  // 1件も申込できず既存チケットも無い場合は、確認画面へ戻してエラー表示（空チケットの404を防ぐ）
  if (addedCount === 0 && alreadyIds.size === 0) {
    redirect(`/forum/kaikan/confirm?ids=${contentIds.join(",")}&error=full`);
  }
  // 一部スキップがあればチケット面に警告表示（申し込めたつもりの欠落を防ぐ）
  const q = skippedTitles.length > 0 ? `?skipped=${encodeURIComponent(skippedTitles.slice(0, 6).join("、"))}` : "";
  redirect(`/forum/kaikan/ticket/${ticketToken}${q}`);
}

/** 管理者：申込を手動キャンセルする。 */
export async function adminCancelKaikanApplication(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) return;
  await prisma.kaikanApplication.updateMany({
    where: { id, status: { not: "cancelled" } },
    data: { status: "cancelled" },
  });
  revalidatePath("/admin/kaikan");
  revalidatePath("/forum/kaikan");
}

/** 管理者：キャンセル済み申込を復帰させる（キャンセルのキャンセル）。 */
export async function adminRestoreKaikanApplication(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) return;
  try {
    await prisma.kaikanApplication.updateMany({
      where: { id, status: "cancelled" },
      data: { status: "confirmed", checked_in_at: null },
    });
  } catch {
    // 同一ユーザーが同コンテンツに別の有効申込を持つとユニーク制約で失敗する
    redirect(`/admin/kaikan?tab=participants&pError=${encodeURIComponent("復帰できませんでした（同じユーザーの有効な申込が既に存在します）")}`);
  }
  revalidatePath("/admin/kaikan");
  revalidatePath("/forum/kaikan");
}

/** 本人：申込のキャンセル（チケットページから・受付前のみ可）。 */
export async function cancelKaikanApplication(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const ticketToken = String(formData.get("ticketToken") || "").trim();
  if (!id) return;

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(ticketToken ? `/forum/kaikan/ticket/${ticketToken}` : "/mypage")}`);

  // 本人の confirmed のみキャンセル可（受付済み・他人の申込は不可）。アトミック更新。
  await prisma.kaikanApplication.updateMany({
    where: { id, profile_id: profile.id, status: "confirmed" },
    data: { status: "cancelled" },
  });

  revalidatePath("/forum/kaikan");
  revalidatePath("/mypage");
  revalidatePath("/admin/kaikan");
  if (ticketToken) revalidatePath(`/forum/kaikan/ticket/${ticketToken}`);
}

/** 管理者：コンテンツ新設。 */
export async function createKaikanContent(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("タイトルは必須です");
  const description = String(formData.get("description") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const startsAtRaw = String(formData.get("starts_at") || "").trim();
  const endsAtRaw = String(formData.get("ends_at") || "").trim();
  const capacityRaw = String(formData.get("capacity") || "").trim();
  const contentType = String(formData.get("content_type") || "session");
  const capNum = capacityRaw ? parseInt(capacityRaw, 10) : NaN;
  await prisma.kaikanContent.create({
    data: {
      title,
      description,
      location,
      starts_at: startsAtRaw ? parseJstDate(startsAtRaw) : null,
      ends_at: endsAtRaw ? parseJstDate(endsAtRaw) : null,
      capacity: Number.isNaN(capNum) ? null : Math.max(0, capNum),
      content_type: contentType,
      is_published: formData.get("is_published") === "on",
    },
  });
  revalidatePath("/admin/kaikan");
  revalidatePath("/forum/kaikan");
}

/** 管理者：CSVからコンテンツを一括インポートする。 */
export async function importKaikanContentsFromCsv(formData: FormData) {
  await requireAdmin();
  const file = formData.get("csv") as File | null;
  if (!file) throw new Error("CSVファイルを選択してください");

  const text = await file.text();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSVにデータ行がありません");

  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const titleIdx = header.indexOf("title");
  const descIdx = header.indexOf("description");
  const locIdx = header.indexOf("location");
  const startIdx = header.indexOf("starts_at");
  const endIdx = header.indexOf("ends_at");
  const capIdx = header.indexOf("capacity");
  const typeIdx = header.indexOf("content_type");
  const pubIdx = header.indexOf("is_published");

  if (titleIdx < 0) throw new Error("CSVにtitle列が必要です");

  // 簡易CSVパース（クォート付きフィールド対応）
  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const title = cols[titleIdx]?.trim();
    if (!title) continue;

    const csvCap = cols[capIdx] ? parseInt(cols[capIdx], 10) : NaN;
    await prisma.kaikanContent.create({
      data: {
        title,
        description: cols[descIdx] ?? "",
        location: cols[locIdx] ?? "",
        starts_at: cols[startIdx] ? parseJstDate(cols[startIdx]) : null,
        ends_at: cols[endIdx] ? parseJstDate(cols[endIdx]) : null,
        capacity: Number.isNaN(csvCap) ? null : Math.max(0, csvCap),
        content_type: cols[typeIdx] || "session",
        is_published: (cols[pubIdx] || "").toLowerCase() === "true",
      },
    });
  }

  revalidatePath("/admin/kaikan");
  revalidatePath("/forum/kaikan");
}

/** 管理者：公開/非公開トグル。 */
export async function setKaikanContentPublished(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const next = String(formData.get("next") || "") === "true";
  if (!id) return;
  await prisma.kaikanContent.update({ where: { id }, data: { is_published: next } });
  revalidatePath("/admin/kaikan");
  revalidatePath("/forum/kaikan");
}

/* ───────── スタッフロール ───────── */

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "エデュマッチ <onboarding@resend.dev>";

async function sendStaffEmail(email: string, name: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[kaikan/staff-email] RESEND_API_KEY 未設定のため通知メールをスキップしました:", email);
    return;
  }
  if (!email) return;
  const resend = new Resend(key);
  const safeName = name.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] ?? c));
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "【エデュマッチ】イベントスタッフに登録されました",
    html: `
      <p>${safeName} 様</p>
      <p>イベントの運営スタッフとして登録されました。<br>
      当日は管理画面から電子チケットの読み取り（QRチェックイン）を行うことができます。</p>
      <p>ご不明点があれば運営までお問い合わせください。</p>
      <p>— エデュマッチ運営</p>
    `.trim(),
  }).catch((e) => console.error("[kaikan/staff-email]", e));
}

/** 管理者：スタッフロールを付与する（メール送信あり）。結果はクエリパラメータでスタッフタブに表示。 */
export async function addKaikanStaff(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) redirect(`/admin/kaikan?tab=staff&staffError=${encodeURIComponent("メールアドレスは必須です")}`);

  // 大文字小文字の揺れを許容して照合（DB側の表記に依存しない）
  const profile = await prisma.profile.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, name: true, email: true },
  });
  if (!profile) {
    redirect(`/admin/kaikan?tab=staff&staffError=${encodeURIComponent(`メール「${email}」のアカウントが見つかりません。本人がエデュマッチに登録済みか確認してください。`)}`);
  }

  const existing = await prisma.kaikanStaff.findUnique({ where: { profile_id: profile.id } });
  if (existing) {
    redirect(`/admin/kaikan?tab=staff&staffError=${encodeURIComponent(`「${email}」は既にスタッフ登録済みです`)}`);
  }

  await prisma.kaikanStaff.create({
    data: { profile_id: profile.id, name: profile.name, email: profile.email },
  });
  await sendStaffEmail(profile.email, profile.name);
  revalidatePath("/admin/kaikan");
  redirect("/admin/kaikan?tab=staff&staffAdded=1");
}

/** 管理者：スタッフを一括登録（メール改行区切り）。成功件数と未登録メールを結果表示。 */
export async function bulkAddKaikanStaff(formData: FormData) {
  await requireAdmin();
  const raw = String(formData.get("emails") || "");
  const emails = [...new Set(raw.split(/[\n,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (emails.length === 0) redirect(`/admin/kaikan?tab=staff&staffError=${encodeURIComponent("メールアドレスを入力してください")}`);

  let added = 0;
  const missed: string[] = [];
  for (const email of emails) {
    const profile = await prisma.profile.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, name: true, email: true },
    });
    if (!profile) {
      missed.push(email);
      continue;
    }
    const existing = await prisma.kaikanStaff.findUnique({ where: { profile_id: profile.id } });
    if (existing) continue; // 既登録はスキップ（エラー扱いにしない）
    await prisma.kaikanStaff.create({
      data: { profile_id: profile.id, name: profile.name, email: profile.email },
    });
    await sendStaffEmail(profile.email, profile.name);
    added++;
  }
  revalidatePath("/admin/kaikan");
  const missedQ = missed.length > 0 ? `&staffMissed=${encodeURIComponent(missed.join(", "))}` : "";
  redirect(`/admin/kaikan?tab=staff&staffAdded=${added}${missedQ}`);
}

/** 管理者：スタッフロールを解除する。 */
export async function removeKaikanStaff(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.kaikanStaff.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/kaikan");
}

/** 管理者・スタッフ：受付チェックイン（QR読み取り先）。 */
export async function checkInKaikanApplication(formData: FormData) {
  await requireAdminOrKaikanStaff();
  const token = String(formData.get("token") || "");
  if (!token) return;
  // アトミック更新：confirmed のみ受付済みへ（既受付の初回時刻を保持・cancelled は不可）。
  // 対象0件でもページ再検証で最新状態が表示されるためエラーにしない。
  await prisma.kaikanApplication.updateMany({
    where: { qr_token: token, status: "confirmed" },
    data: { status: "checked_in", checked_in_at: new Date() },
  });
  revalidatePath(`/admin/kaikan/checkin/${token}`);
  revalidatePath("/admin/kaikan");
}
