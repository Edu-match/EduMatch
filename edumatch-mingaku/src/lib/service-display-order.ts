/**
 * サービス表示順（トップページ・サービス一覧で共通）
 * プレミアム → スタンダード → ベーシック → その他 の順
 */
const ORDER_KEYWORDS: string[][] = [
  ["ワンリード"],
  ["システムASSIST", "アシスト"],
  ["KAWASEMI Lite", "カワセミライト"],
  ["V-Growth"],
  ["TERRACE", "テラス"],
  ["aim@", "エイムアット"],
  ["Dr.okke", "okke"],
  ["塾シル"],
  ["受験コンパス", "Liew", "リュウ"],
  ["Kidsプログラミングラボ", "キッズプログラミング"],
  ["CodeCampKIDS", "コードキャンプ"],
  ["スリーピース", "まならぶる"],
];

function matchIndex(title: string, providerDisplayName?: string | null): number {
  const text = [title, providerDisplayName].filter(Boolean).join(" ");
  for (let i = 0; i < ORDER_KEYWORDS.length; i++) {
    if (ORDER_KEYWORDS[i].some((kw) => text.includes(kw))) return i;
  }
  return ORDER_KEYWORDS.length;
}

export type ServiceForSort = { title: string; provider_display_name?: string | null };

export type ServiceWithIdForSort = ServiceForSort & { id: string };

export function sortServicesByDisplayOrder<T extends ServiceForSort>(services: T[]): T[] {
  return [...services].sort((a, b) => {
    const ia = matchIndex(a.title, a.provider_display_name);
    const ib = matchIndex(b.title, b.provider_display_name);
    if (ia !== ib) return ia - ib;
    return 0;
  });
}

/** 表示順に並んだサービスIDの配列（クライアント側のソート用） */
export function getDisplayOrderIds(services: ServiceWithIdForSort[]): string[] {
  return sortServicesByDisplayOrder(services).map((s) => s.id);
}
