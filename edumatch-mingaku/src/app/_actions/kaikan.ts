"use server";

import { randomUUID, randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, requireAdmin, requireStaffOrAdmin } from "@/lib/auth";

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

/** ログイン中アカウントでコンテンツに申込→電子チケット(QR)を発行。氏名/メールはアカウント情報を使用。 */
export async function applyForKaikanContent(formData: FormData) {
  const contentId = String(formData.get("contentId") || "").trim();
  const note = String(formData.get("note") || "").trim();
  if (!contentId) throw new Error("コンテンツが不正です");

  // 申込にはログイン必須。氏名・メールはアカウント登録情報を使う。
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("申込にはログインが必要です");

  // 招待コード必須。
  if (!(await hasRedeemedInvite(profile.id))) {
    throw new Error("申込には招待コードの入力が必要です。先に教育AIサミット全体（Peatix）へお申込みのうえ、届いた招待コードを入力してください。");
  }

  const content = await prisma.kaikanContent.findUnique({ where: { id: contentId } });
  if (!content || !content.is_published) throw new Error("受付を終了したか、存在しないコンテンツです");

  // 時間重複チェック：既存の申込と時間帯が重なる場合は不可。
  const myApps = await prisma.kaikanApplication.findMany({
    where: { profile_id: profile.id, status: { not: "cancelled" } },
    select: { content_id: true },
  });
  if (myApps.length > 0) {
    const others = await prisma.kaikanContent.findMany({
      where: { id: { in: myApps.map((a) => a.content_id) } },
      select: { title: true, starts_at: true, ends_at: true },
    });
    const clash = others.find((o) => timeOverlaps(content.starts_at, content.ends_at, o.starts_at, o.ends_at));
    if (clash) throw new Error(`時間帯が重複しているため申し込めません：「${content.title}」と「${clash.title}」`);
  }

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

  // 招待コード必須（Peatixで全体申込→メールのコードを入力済みであること）。
  if (!(await hasRedeemedInvite(profile.id))) {
    throw new Error("申込には招待コードの入力が必要です。先に教育AIサミット全体（Peatix）へお申込みのうえ、届いた招待コードを入力してください。");
  }

  // 既存の自分の申込（このアカウント）を見て、チケットを流用しつつ二重を避ける
  const existingApps = await prisma.kaikanApplication.findMany({
    where: { profile_id: profile.id, status: { not: "cancelled" } },
    select: { content_id: true, ticket_token: true },
  });
  const alreadyIds = new Set(existingApps.map((a) => a.content_id));
  const ticketToken = existingApps.find((a) => a.ticket_token)?.ticket_token ?? randomUUID().replace(/-/g, "");

  const toAdd = contentIds.filter((id) => !alreadyIds.has(id));
  const contents = await prisma.kaikanContent.findMany({ where: { id: { in: toAdd }, is_published: true } });

  // 時間重複チェック：今回追加分 ＋ 既存申込分の中で、時間帯が重なる組み合わせがあれば申込不可。
  const existingContents = existingApps.length > 0
    ? await prisma.kaikanContent.findMany({
        where: { id: { in: existingApps.map((a) => a.content_id) } },
        select: { id: true, title: true, starts_at: true, ends_at: true },
      })
    : [];
  const timeline = [
    ...existingContents,
    ...contents.map((c) => ({ id: c.id, title: c.title, starts_at: c.starts_at, ends_at: c.ends_at })),
  ];
  for (let i = 0; i < timeline.length; i++) {
    for (let j = i + 1; j < timeline.length; j++) {
      const a = timeline[i], b = timeline[j];
      if (a.id !== b.id && timeOverlaps(a.starts_at, a.ends_at, b.starts_at, b.ends_at)) {
        throw new Error(`時間帯が重複しているため同時に申し込めません：「${a.title}」と「${b.title}」`);
      }
    }
  }

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
  await prisma.kaikanContent.create({
    data: {
      title,
      description,
      location,
      starts_at: startsAtRaw ? new Date(startsAtRaw) : null,
      ends_at: endsAtRaw ? new Date(endsAtRaw) : null,
      capacity: capacityRaw ? Math.max(0, parseInt(capacityRaw, 10)) || null : null,
      is_published: formData.get("is_published") === "on",
    },
  });
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

/** スタッフ以上：受付チェックイン（QR読み取り先）。 */
export async function checkInKaikanApplication(formData: FormData) {
  await requireStaffOrAdmin();
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

/** 管理者：メールアドレスでスタッフ権限を付与する。 */
export async function grantStaffRole(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) throw new Error("メールアドレスを入力してください");

  const profile = await prisma.profile.findFirst({ where: { email } });
  if (!profile) throw new Error("該当するユーザーが見つかりません");
  if (profile.role === "ADMIN") throw new Error("管理者のロールは変更できません");

  await prisma.profile.update({ where: { id: profile.id }, data: { role: "STAFF" } });
  revalidatePath("/admin/kaikan");
}

/** 管理者：スタッフ権限を解除する。 */
export async function revokeStaffRole(formData: FormData) {
  await requireAdmin();
  const profileId = String(formData.get("profileId") || "");
  if (!profileId) return;

  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile || profile.role !== "STAFF") return;

  await prisma.profile.update({ where: { id: profileId }, data: { role: "VIEWER" } });
  revalidatePath("/admin/kaikan");
}
