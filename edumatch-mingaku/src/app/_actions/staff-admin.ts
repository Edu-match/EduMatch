"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getProfiles() {
  await requireAdmin();

  const profiles = await prisma.profile.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { created_at: "desc" },
  });

  return profiles;
}

export async function updateRole(
  userId: string,
  newRole: "STAFF" | "VIEWER"
) {
  await requireAdmin();

  if (newRole !== "STAFF" && newRole !== "VIEWER") {
    throw new Error("許可されていないロールです");
  }

  const target = await prisma.profile.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!target) {
    throw new Error("ユーザーが見つかりません");
  }

  if (target.role === "ADMIN") {
    throw new Error("管理者のロールは変更できません");
  }

  await prisma.profile.update({
    where: { id: userId },
    data: { role: newRole },
  });

  revalidatePath("/admin/staff");
}
