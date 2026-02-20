import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// キャッシュされたクライアントに seminarEvent が無い（古い生成）場合は使わない
const cached = globalForPrisma.prisma;
const useCached =
  cached != null && "seminarEvent" in cached && typeof (cached as PrismaClient).seminarEvent === "object";

export const prisma =
  (useCached ? cached : undefined) ??
  new PrismaClient({
    // development: "error"は接続不可時に重複ログになるため外す（_actions 側でハンドリング）
    log: process.env.NODE_ENV === "development" ? ["warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
