import { getAllServices } from "@/app/_actions";
import { sortServicesByDisplayOrder, getDisplayOrderIds } from "@/lib/service-display-order";
import { ServicesClient } from "./services-client";
import { SERVICE_CATEGORY_LIST } from "@/lib/categories";
import { serviceThumbnailPlaceholder } from "@/lib/utils";

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
  const services = await getAllServices();

  // カテゴリ「すべて」のときの表示順: 指定リスト順（プレミアム→スタンダード→ベーシック→その他）
  const sorted = sortServicesByDisplayOrder(services);
  const displayOrderIds = getDisplayOrderIds(services);

  const serviceList: ServiceForList[] = sorted.map((service) => ({
    id: service.id,
    name: service.title,
    description: service.description ?? "",
    category: service.category ?? "",
    image: service.thumbnail_url || serviceThumbnailPlaceholder(service.title, 300, 200),
    price: service.price_info ?? "",
  }));

  // サービスカテゴリ一覧（1件以上あるものだけ表示）
  const categoryCounts = new Map<string, number>();
  for (const c of SERVICE_CATEGORY_LIST) categoryCounts.set(c, 0);
  for (const s of serviceList) {
    if (s.category) {
      categoryCounts.set(s.category, (categoryCounts.get(s.category) ?? 0) + 1);
    }
  }
  // SERVICE_CATEGORY_LIST の順を維持しつつ1件以上のものを表示
  let categoriesWithCount = [...SERVICE_CATEGORY_LIST].filter(
    (c) => (categoryCounts.get(c) ?? 0) > 0
  );
  // カテゴリが1件もない場合は全カテゴリを表示
  if (categoriesWithCount.length === 0) {
    categoriesWithCount = [...SERVICE_CATEGORY_LIST];
  }

  return (
    <ServicesClient
      services={serviceList}
      categoriesWithCount={categoriesWithCount}
      displayOrderIds={displayOrderIds}
    />
  );
}
