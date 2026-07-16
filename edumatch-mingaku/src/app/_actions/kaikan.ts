"use server";

import { randomUUID, randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";

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

/** ログイン中アカウントでコンテンツに申込→電子チケット(QR)を発行。氏名/メールはアカウント情報を使用。 */
export async function applyForKaikanContent(formData: FormData) {
  const contentId = String(formData.get("contentId") || "").trim();
  const note = String(formData.get("note") || "").trim();
  if (!contentId) throw new Error("コンテンツが不正です");

  // 申込にはログイン必須。氏名・メールはアカウント登録情報を使う。
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("申込にはログインが必要です");

  const content = await prisma.kaikanContent.findUnique({ where: { id: contentId } });
  if (!content || !content.is_published) throw new Error("受付を終了したか、存在しないコンテンツです");

  // 同一アカウントの二重申込を防ぐ：既存があればそのチケットへ。
  const existing = await prisma.kaikanApplication.findFirst({
    where: { content_id: contentId, profile_id: profile.id, status: { not: "cancelled" } },
    select: { qr_token: true, ticket_token: true },
  });
  if (existing) redirect(`/forum/kaikan/ticket/${existing.ticket_token ?? existing.qr_token}`);

  if (content.capacity != null) {
    const count = await prisma.kaikanApplication.count({
      where: { content_id: contentId, status: { not: "cancelled" } },
    });
    if (count >= content.capacity) throw new Error("定員に達しました");
  }

  const token = randomUUID().replace(/-/g, "");
  await prisma.kaikanApplication.create({
    data: {
      content_id: contentId,
      name: profile.name,
      email: profile.email ?? "",
      note,
      qr_token: token,
      ticket_token: token,
      profile_id: profile.id,
    },
  });
  revalidatePath("/admin/kaikan");
  redirect(`/forum/kaikan/ticket/${token}`);
}

/** 複数コンテンツをまとめて申込→1枚のチケット(共有ticket_token)に集約。受付はセッション単位。 */
export async function applyForKaikanContents(formData: FormData) {
  const contentIds = formData.getAll("contentId").map(String).map((s) => s.trim()).filter(Boolean);
  const note = String(formData.get("note") || "").trim();
  if (contentIds.length === 0) throw new Error("コンテンツを1つ以上選んでください");

  const profile = await getCurrentProfile();
  if (!profile) throw new Error("申込にはログインが必要です");

  // 既存の自分の申込（このアカウント）を見て、チケットを流用しつつ二重を避ける
  const existingApps = await prisma.kaikanApplication.findMany({
    where: { profile_id: profile.id, status: { not: "cancelled" } },
    select: { content_id: true, ticket_token: true },
  });
  const alreadyIds = new Set(existingApps.map((a) => a.content_id));
  const ticketToken = existingApps.find((a) => a.ticket_token)?.ticket_token ?? randomUUID().replace(/-/g, "");

  const toAdd = contentIds.filter((id) => !alreadyIds.has(id));
  const contents = await prisma.kaikanContent.findMany({ where: { id: { in: toAdd }, is_published: true } });
  for (const c of contents) {
    if (c.capacity != null) {
      const count = await prisma.kaikanApplication.count({ where: { content_id: c.id, status: { not: "cancelled" } } });
      if (count >= c.capacity) continue; // 満員は除外
    }
    await prisma.kaikanApplication.create({
      data: {
        content_id: c.id,
        name: profile.name,
        email: profile.email ?? "",
        note,
        qr_token: randomUUID().replace(/-/g, ""),
        ticket_token: ticketToken,
        profile_id: profile.id,
      },
    });
  }
  revalidatePath("/admin/kaikan");
  redirect(`/forum/kaikan/ticket/${ticketToken}`);
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
  await prisma.kaikanContent.create({
    data: {
      title,
      description,
      location,
      starts_at: startsAtRaw ? new Date(startsAtRaw) : null,
      ends_at: endsAtRaw ? new Date(endsAtRaw) : null,
      capacity: capacityRaw ? Math.max(0, parseInt(capacityRaw, 10)) || null : null,
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

    await prisma.kaikanContent.create({
      data: {
        title,
        description: cols[descIdx] ?? "",
        location: cols[locIdx] ?? "",
        starts_at: cols[startIdx] ? new Date(cols[startIdx]) : null,
        ends_at: cols[endIdx] ? new Date(cols[endIdx]) : null,
        capacity: cols[capIdx] ? parseInt(cols[capIdx], 10) || null : null,
        content_type: cols[typeIdx] || "session",
        is_published: cols[pubIdx] === "true",
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
  if (!key || !email) return;
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

/** 管理者：スタッフロールを付与する（メール送信あり）。 */
export async function addKaikanStaff(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) throw new Error("メールアドレスは必須です");

  const profile = await prisma.profile.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!profile) throw new Error(`メール「${email}」のアカウントが見つかりません`);

  const existing = await prisma.kaikanStaff.findUnique({ where: { profile_id: profile.id } });
  if (existing) {
    revalidatePath("/admin/kaikan");
    return;
  }

  await prisma.kaikanStaff.create({
    data: { profile_id: profile.id, name: profile.name, email: profile.email },
  });
  await sendStaffEmail(profile.email, profile.name);
  revalidatePath("/admin/kaikan");
}

/** 管理者：スタッフを一括登録（メール改行区切り）。 */
export async function bulkAddKaikanStaff(formData: FormData) {
  await requireAdmin();
  const raw = String(formData.get("emails") || "");
  const emails = raw.split(/[\n,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) throw new Error("メールアドレスを入力してください");

  let added = 0;
  for (const email of emails) {
    const profile = await prisma.profile.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
    if (!profile) continue;
    const existing = await prisma.kaikanStaff.findUnique({ where: { profile_id: profile.id } });
    if (existing) continue;
    await prisma.kaikanStaff.create({
      data: { profile_id: profile.id, name: profile.name, email: profile.email },
    });
    await sendStaffEmail(profile.email, profile.name);
    added++;
  }
  revalidatePath("/admin/kaikan");
}

/** 管理者：スタッフロールを解除する。 */
export async function removeKaikanStaff(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.kaikanStaff.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/kaikan");
}

/** 管理者：受付チェックイン（QR読み取り先）。 */
export async function checkInKaikanApplication(formData: FormData) {
  await requireAdmin();
  const token = String(formData.get("token") || "");
  if (!token) throw new Error("トークンが不正です");
  const app = await prisma.kaikanApplication.findUnique({ where: { qr_token: token } });
  if (!app) throw new Error("申込が見つかりません");
  await prisma.kaikanApplication.update({
    where: { qr_token: token },
    data: { status: "checked_in", checked_in_at: new Date() },
  });
  revalidatePath(`/admin/kaikan/checkin/${token}`);
  revalidatePath("/admin/kaikan");
}
