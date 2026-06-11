import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InteropBoard } from "@/components/interop/interop-board";
import { InteropGeofence } from "@/components/interop/interop-geofence";
import { getInteropSettings } from "@/lib/interop-settings.server";

export const dynamic = "force-dynamic";

async function loadSub(subId: string) {
  try {
    return await prisma.interopSubCategory.findFirst({
      where: { id: subId, is_active: true },
      include: { category: { select: { id: true, name: true, color: true, slug: true } } },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subId: string }>;
}): Promise<Metadata> {
  const { subId } = await params;
  const sub = await loadSub(subId);
  if (!sub) return { title: "教育AIサミット | Interop Tokyo 2026" };
  return {
    title: `${sub.name} | 教育AIサミット`,
    description: sub.description || `${sub.category.name} - ${sub.name}`,
  };
}

export default async function InteropSubPage({
  params,
}: {
  params: Promise<{ subId: string }>;
}) {
  const { subId } = await params;
  const sub = await loadSub(subId);
  if (!sub) notFound();

  const settings = await getInteropSettings();

  return (
    <>
      <InteropBoard
        sub={{
          id: sub.id,
          name: sub.name,
          description: sub.description,
          categoryId: sub.category.id,
          categoryName: sub.category.name,
          categorySlug: sub.category.slug,
        }}
        accent={sub.category.color || "#9fb4e8"}
        themeMode={settings.themeMode}
      />
      <InteropGeofence settings={settings} />
    </>
  );
}
