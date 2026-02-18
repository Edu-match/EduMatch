import { getPublicServicesFromSupabase } from "@/lib/supabase-services";
import { ServicesClient } from "./services-client";
import { ARTICLE_CATEGORIES } from "@/lib/categories";

export const dynamic = "force-dynamic";

export type ServiceForList = {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  price: string;
};

export default async function ServicesPage() {
  const services = await getPublicServicesFromSupabase();

  const serviceList: ServiceForList[] = services.map((service) => ({
    id: service.id,
    name: service.title,
    description: service.description,
    category: service.category,
    image: service.thumbnail_url || "https://placehold.co/300x200/e0f2fe/0369a1?text=Service",
    price: service.price_info,
  }));

  // 公開一覧用: 記事/サービスが1件以上あるカテゴリのみ表示（0件は非表示）
  const categoryCounts = new Map<string, number>();
  for (const c of ARTICLE_CATEGORIES) categoryCounts.set(c, 0);
  for (const s of serviceList) {
    if (s.category && categoryCounts.has(s.category)) {
      categoryCounts.set(s.category, (categoryCounts.get(s.category) ?? 0) + 1);
    }
  }
  let categoriesWithCount = ARTICLE_CATEGORIES.filter((c) => (categoryCounts.get(c) ?? 0) > 0);
  // 既存データが旧カテゴリの場合は1件もマッチせず空になるため、そのときは全カテゴリを表示
  if (categoriesWithCount.length === 0) {
    categoriesWithCount = [...ARTICLE_CATEGORIES];
  }

  return (
    <ServicesClient
      services={serviceList}
      categoriesWithCount={categoriesWithCount}
    />
  );
}
