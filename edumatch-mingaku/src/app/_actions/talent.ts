"use server";

import { prisma } from "@/lib/prisma";

export type TalentCompany = Awaited<ReturnType<typeof getTalentMatchingCompanies>>[number];

/** 人材マッチングに掲載中の企業一覧を取得する */
export async function getTalentMatchingCompanies() {
  return prisma.corporateProfile.findMany({
    where: { talent_matching_enabled: true },
    include: {
      profile: {
        include: {
          services: {
            where: { is_published: true },
            select: { id: true, title: true, category: true },
            orderBy: { created_at: "desc" },
            take: 5,
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });
}
