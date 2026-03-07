import { getAllServices } from "@/app/_actions";
import { ServicesClient } from "./services-client";
import { SERVICE_CATEGORY_LIST } from "@/lib/categories";

export const dynamic = "force-dynamic";

export type ServiceForList = {
  id: string;
  name: string;
  description: string;
  category: string;
  /** サムネイルURL。未設定時はタイトルを表示 */
  image?: string | null;
  price: string;
  /** 「なし」の場合は資料請求・お気に入り追加を非表示 */
  sort_order?: string;
};

export default async function ServicesPage() {
  const services = await getAllServices();

  // 表示順は Supabase の sort_order で管理（DB取得時点でソート済み）
  const displayOrderIds = services.map((s) => s.id);
  const serviceList: ServiceForList[] = services.map((service) => ({
    id: service.id,
    name: service.title,
    description: service.description ?? "",
    category: service.category ?? "",
    image: service.thumbnail_url ?? undefined,
    price: service.price_info ?? "",
    sort_order: service.sort_order,
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
