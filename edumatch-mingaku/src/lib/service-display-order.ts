/**
 * サービス一覧「すべて」選択時・掲載企業一覧の表示順（指定リスト厳守）
 * プレミアム → スタンダード → ベーシック → その他
 * 各スロットはサービス名 or 提供者名のキーワードでマッチ（先にマッチしたスロットの順）
 */
const ORDER_KEYWORDS: readonly string[][] = [
  ["ワンリード", "CROP"],
  ["システムASSIST", "青山英語学院"],
  ["KAWASEMI", "Lite", "英俊社"],
  ["V-Growth"],
  ["TERRACE", "テラス", "SRJ"],
  ["aim@", "エイムアット", "メイツ"],
  ["Dr.okke", "okke"],
  ["塾シル", "ユナイトプロジェクト"],
  ["受験コンパス", "Liew", "リュウ", "Lacicu"],
  ["Kidsプログラミング", "Kidsプログラミングラボ"],
  ["CodeCampKIDS", "コードキャンプ"],
  ["スリーピース"],
];

function normalize(s: string): string {
  return (s ?? "").replace(/\s+/g, "").toLowerCase();
}

function containsAny(text: string, keywords: readonly string[]): boolean {
  const n = normalize(text);
  return keywords.some((k) => n.includes(normalize(k)));
}

/**
 * 表示順のインデックスを返す。リストに無い場合は 9999
 */
export function getServiceDisplayIndex(service: {
  title: string;
  provider_display_name?: string | null;
  provider?: { name: string };
}): number {
  const title = service.title ?? "";
  const providerName = service.provider_display_name ?? service.provider?.name ?? "";
  for (let i = 0; i < ORDER_KEYWORDS.length; i++) {
    if (containsAny(title, ORDER_KEYWORDS[i]) || containsAny(providerName, ORDER_KEYWORDS[i])) {
      return i;
    }
  }
  return 9999;
}

/**
 * サービス一覧を指定順でソート
 */
export function sortServicesByDisplayOrder<T extends { title: string; provider_display_name?: string | null; provider?: { name: string } }>(
  services: T[]
): T[] {
  return [...services].sort((a, b) => {
    const ia = getServiceDisplayIndex(a);
    const ib = getServiceDisplayIndex(b);
    return ia - ib;
  });
}

/**
 * 指定順に並んだサービスIDの配列を返す（クライアントで「すべて」時の並び替えに使用）
 */
export function getDisplayOrderIds<T extends { id: string; title: string; provider_display_name?: string | null; provider?: { name: string } }>(
  services: T[]
): string[] {
  return sortServicesByDisplayOrder(services).map((s) => s.id);
}
